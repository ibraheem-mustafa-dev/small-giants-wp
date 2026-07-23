---
doc_type: spec
spec_id: 32
spec_version: "1.3"
title: Component Styling Token Contract (framework-wide)
project: small-giants-wp
status: active
authors: Claude + Bean
session_date: 2026-07-07
last_verified: 2026-07-18
status_history:
  - 2026-07-18: v1.3 — FR-32-4 amended to FORBID inline `--var` (`style="--sgs-…:…"`); per-instance override values MUST emit as a scoped `.{uid}.{block}{--var:…}` rule via the collector, aligning FR-32-4 with the already-newer §6.1(e) + Spec 31 FR-31-22.3. Also tightened FR-32-1 done-when + §8 acceptance row (count ANY `style` content, not just property declarations) and §5/§6 flow-diagram (scoped, not inline `--var`). Closes footprint GOTCHA E (permissive outlier) + GOTCHA F (`[style*="--var"]` selector break). D345. Opens the framework-wide inline-zero rollout (`plans/2026-07-17-phase-inline-zero-rollout.md`).
  - 2026-07-07: v1.0 — initial spec. Restores + generalises the pre-D283 token/class design (Spec 11 Decision 24) as a framework-wide contract; supersedes the D283 preset-as-seed inline-attr model for styling.
  - 2026-07-09: v1.1 — added §6.1 Geometry token families / box-object contract (named-object `{top,right,bottom,left}`/corner shape, keep-support-serialise-scoped correction, the 10-merge/10-scalar family roster, FR-32-10). Reconciles the geometry (spacing/border) sibling to §6's colour/typography preset mechanism, per `plans/2026-07-09-no-inline-styling-design-gate.md` + `plans/2026-07-09-box-object-interface-contract.md`.
  - 2026-07-12: v1.2 — added §6.2 CSS output consolidation contract (FR-32-11): every block registers its scoped CSS into the shared SGS collector instead of echoing a per-block `<style>` tag; frontend flushes once; DEFAULT output is a cached external file (generate-then-serve, head-enqueued) with a single consolidated inline footer `<style>` as fallback; editor keeps inline emission. Encodes the `P-STYLE-TAG-CONSOLIDATION` design (`plans/2026-07-12-style-tag-consolidation-design.md`). Updated §5 performance + §6.1(b) emit route accordingly.
references:
  - .claude/specs/11-SGS-BUTTON-ARCHITECTURE.md
  - .claude/specs/26-SGS-GLOBAL-STYLES-AND-THEMING.md
  - .claude/specs/31-UNIVERSAL-CLONING-PIPELINE.md
  - .claude/plans/2026-07-07-button-external-css-rearchitecture.md
  - .claude/plans/2026-07-09-no-inline-styling-design-gate.md
  - .claude/plans/2026-07-09-box-object-interface-contract.md
absorbs: null
absorbed_by: null
lock_reason: null
---

# Component Styling Token Contract

> **One-liner:** Every SGS block styles itself with semantic BEM classes that CONSUME per-client design tokens (CSS custom properties auto-generated from the theme snapshot) — never hardcoded client values, never inline property declarations — so the same block library re-skins across any client by changing `theme.json`/the snapshot alone.

## 0. Problem statement

SGS is a reusable component library driven by a cloning pipeline, not a manual-authoring plugin. Two failures made the button (and, by the same anti-pattern, "a huge amount of our blocks") un-reusable and buggy:

1. **Inline property declarations.** `render.php` baked colour/border values into the element's `style=""`. Inline styles (specificity 1,0,0,0) beat every stylesheet rule including `:hover` — so hover silently died — and they bake client brand into block markup, so the block cannot re-skin per client.
2. **No shared styling contract.** Each block invented its own approach (inline attrs here, `.is-style-*` there, prefixed helpers elsewhere), so there was no single pattern a new block could follow.

The correct design already existed pre-D283 (Spec 11 Decision 24, 2026-05-22): a `.is-style-{preset}` class consuming `--wp--custom--button-presets--*` vars that WordPress auto-generates from `theme.json.settings.custom`. **D283 (2026-07-06) replaced it with a preset-as-seed inline-attr model** — the regression this spec reverses. The auto-generated vars are still emitted at `:root` on live sites (verified 2026-07-07); only `render.php`'s inline painting bypassed them.

## 1. Who this is for

| Role | What they get |
|---|---|
| The cloning pipeline | One deterministic styling target: emit a semantic class + populate snapshot tokens. Never emits inline styles. |
| Every current + future block | A single styling pattern to follow — tokens + BEM class + var-based overrides — instead of inventing one. |
| Client sites | Full per-client re-skin by editing the snapshot / `theme.json` alone; no block code changes. |
| Bean (QC) | Predictable, own-the-CSS behaviour; no inline-style bloat, no WP-cascade surprises. |

## 2. Goals & non-goals

**Goals**
- A framework-wide, block-agnostic styling contract every block obeys.
- Zero client brand values baked into any block's markup or CSS.
- Hover / focus / responsive states expressed in stylesheets, never inline.
- The cloning pipeline populates tokens; blocks consume them; nothing hand-authored.

**Non-goals**
- WordPress Block Style Variations (`register_block_style` + theme.json variations). Evaluated + rejected 2026-07-07: they optimise for MANUAL authoring (editor Styles switcher, client self-service editing) which a pipeline-driven, auto-preset-determined library does not need; they add pipeline-mapping friction + WP-cascade coupling for ~zero gain here. (Research: `.claude/plans/2026-07-07-button-external-css-rearchitecture.md`.)
- Editor Global-Styles self-service preset editing (clients do not author; Bean QCs).

## 3. Hard constraints

| Constraint | Source | Non-negotiable |
|---|---|---|
| No block setting is ever emitted as an inline `style=""` property declaration | Bean 2026-07-07 | Y |
| Hover/focus/active/responsive states live in a stylesheet rule only | CSS (inline cannot express pseudo/`@media`) + Spec 31 R-31-6 | Y |
| No client brand value (hex/token slug/px) hardcoded in block PHP/JS/CSS | Bean 2026-07-07 | Y |
| **THE DEFAULT-vs-HARDCODE TEST — the question is NOT "is it a literal?" but "does it override a theme-wide default, or hinder the pipeline?"** A block literal that **duplicates a `theme.json styles.elements` default is a SILENT OVERRIDE that disables the theme** — check theme.json BEFORE adding any typography literal to a block. A component's OWN constant that overrides no theme-wide default and stays per-instance overridable **STAYS**. `null`/`''` default = inherit is the canonical pattern. | **Bean-locked D338 2026-07-15** | Y |
| Per-client values flow through `theme.json.settings.custom.*Presets` → WP-generated CSS vars | Spec 11 D24 (proven) | Y |
| Pipeline extracts tokens from the draft; never Claude hand-authoring, never asking Bean for values | Bean 2026-07-07 | Y |

## 4. Functional Requirements

### Component Contract
- **FR-32-1** — Every block MUST render its styleable elements with **semantic BEM classes** (`.sgs-{block}` + `.sgs-{block}--{variant}` + `.sgs-{block}__{element}`). The class is the styling hook; markup carries no colour/geometry values. *Done when:* the emitted HTML carries **no `style` attribute at all** on the block's rendered elements — neither a property declaration (`color:…`) NOR a custom-property value (`--sgs-…:…`) NOR an empty `style=""` (grep the live DOM: 0 `style="` on `sgs/*` elements, per the FR-32-4 amendment 2026-07-18/D345). *(A `style` attribute counting only "properties" would silently permit inline `--var`, the loophole D345 closed.)*
- **FR-32-2** — A block's `style.css` MUST style each variant by **consuming design tokens** with a framework-default fallback: `.sgs-{block}--{variant} { <prop>: var(--wp--custom--{block}-presets--{variant}--{role}, var(--wp--preset--color--{fallback})); }`. *Done when:* changing only the snapshot token re-skins the block with no block-code change (verified live).
- **FR-32-3** — Hover/focus/active/responsive states MUST be authored as stylesheet rules (`.sgs-{block}--{variant}:hover { … }`, `@media { … }`) consuming the `hover-*` / tier tokens. *Done when:* a preset button changes colour on `:hover` on the live page (computed style before/after hover differ).

### Override Strategy
- **FR-32-4** — A per-instance override (editor-set custom value, or a genuine per-block draft exception) MUST be emitted as a **CSS custom property VALUE** scoped to the instance (`--sgs-{block}-{role}: <value>`), consumed by the block's class rule via `var()`. It MUST NOT be an inline property declaration (`color: …`). **The custom property itself MUST NOT be emitted inline either (`style="--sgs-{block}-{role}: <value>"` is FORBIDDEN on the frontend, amended 2026-07-18 / D345):** the per-instance value MUST be written as a scoped `.{$uid}.{block-root-class}{ --sgs-{block}-{role}: <value>; }` rule in the block's own `<style>`, registered into the shared SGS collector (FR-32-11 / §6.2). *(Rationale: even a bare inline `--var` (a) leaves a `style` attribute on the rendered element, which the framework-wide gate treats as a violation, and (b) silently breaks any CSS rule that gates on an inline-attribute-presence selector `[style*="--var"]` the moment the value later moves scoped — the live gold-hover-border break on brand-strip, footprint GOTCHA F. It also loses nothing: the scoped custom-property VALUE still cannot beat `:hover` and applies identically. This aligns FR-32-4 with the already-newer §6.1(e) + Spec 31 FR-31-22.3, which the converter already follows — no converter path changes.)* The **only** permitted non-attr, non-scoped-`<style>` styling output anywhere in this contract is the documented `sgsCustomCss` residual (§6.1(e) / Spec 31 FR-31-5.2), and even that is a scoped stylesheet rule, never an inline `style=` attribute. *Done when:* an overridden instance shows the custom value in editor AND frontend, its `:hover` still works, AND the rendered element carries NO `style` attribute (grep the live DOM: 0 `style="--` on `sgs/*` elements).

### Design Token Specification
- **FR-32-5** — Per-client component tokens live in `sites/<client>/theme-snapshot.json` under `settings.custom.{component}Presets.{variant}.{role}` (values = theme-token references `var(--wp--preset--color--X)`, raw CSS lengths, or `transparent`). WordPress auto-emits these as `--wp--custom--{component}-presets--{variant}--{role}` at `:root` when the snapshot's `settings` are pushed to `wp_global_styles`. *Done when:* the vars resolve at `:root` on the live site (verified 2026-07-07 for buttonPresets).
- **FR-32-6** — A block's `style.css` MUST provide a framework-default fallback (a `var(--wp--preset--color--X)` theme token, never a client hex) for every consumed token, so a freshly-inserted block on a client with no `{component}Presets` still looks correct. *Done when:* a block renders sensibly with the `{component}Presets` key absent from the snapshot.

### Pipeline Contract
- **FR-32-7** — The pipeline EXTRACTS a draft's per-variant styling (base + hover, every declared property) into `settings.custom.{component}Presets` accurately — no hand-authoring, no asking Bean. Reference extractor: `plugins/sgs-blocks/scripts/extract-button-presets.py`. *Done when:* the extractor reproduces the draft's `.sgs-{block}--{variant}` + `:hover` declarations into the snapshot for the reference block.
- **FR-32-8** — The converter EMITS the semantic variant class (`.sgs-{block}--{variant}`) for a recognised preset and emits NO inline colour/geometry style. A draft element with no variant signal stays its natural element (a naked link stays a naked link — NOT forced to a default preset). *Done when:* a cloned preset button carries only `sgs-button sgs-button--{variant}` (+ WP block class); a naked draft link does not become a preset button. (Fixes live defect #9.)

### Naming Convention
- **FR-32-9** — The token namespace is `{component}Presets` (camelCase) in `settings.custom`, where `{component}` matches the block's kebab base (`button` → `buttonPresets`, `card` → `cardPresets`, `hero` → `heroPresets`). Variant slugs are semantic (`primary`/`secondary`/`outline`/…). Role keys are a fixed vocabulary: `background`, `text`, `border`, `hover-background`, `hover-text`, `hover-border` (+ geometry: `border-width`, `border-radius`, `padding`, `font-size`, `font-weight`, `min-height`). *Done when:* every component's tokens follow this scheme (lint/grep check per component).

### CSS Output Consolidation
- **FR-32-11** — A block's sanctioned scoped `<style>` (§6.1(b)) MUST NOT be echoed per-instance into the page body on the frontend. Instead every block **registers** its finished scoped CSS string into the shared SGS collector (`sgs_collect_css($uid, $css)`); the frontend flushes the whole buffer ONCE. The **default frontend output is a single cached external stylesheet** (`/uploads/sgs-css/<content-hash>.css`, generate-then-serve, enqueued in the `<head>`), with a **single consolidated inline footer `<style id="sgs-blocks-collected">`** as the always-correct fallback (cold/changed load, or when uploads are not writable). Buffer keying is by `$uid` (deduped); source order is preserved so the `sgsCustomCss` residual still lands last per uid (Spec 31 FR-31-5.2 / D303). The **editor context keeps inline per-block emission** — ServerSideRender/the block-renderer REST route has no `wp_footer`, so consolidation is frontend-only. A `sgs_css_output_mode` filter selects `file` (default) or `inline`; `save_post` invalidates the pointer; the content-hash filename self-busts. Full mechanism: §6.2 + `plans/2026-07-12-style-tag-consolidation-design.md`. *Done when:* a live cloned page renders **0 body `<style>` tags** and one head `<link>` to the hashed file (default mode), with zero visual regression at 375/768/1440 and the editor canvas still styled.

## 5. Non-functional requirements

- **Performance:** static preset CSS lives in the block's enqueued `style.css` (shared, cached) — not per-instance `<style>`. Per-instance override vars add only a tiny scoped `.{uid}.{block}{ --var:value }` rule (registered into the shared collector, NOT inline — FR-32-4 as amended 2026-07-18) when actually overridden. **Per-instance scoped CSS (responsive tiers, `:hover`, box/typography rules, AND per-instance override `--var` values) is CONSOLIDATED, not scattered** — every block registers into the shared collector (FR-32-11 / §6.2) and the frontend emits ONE cached external stylesheet (default) or one inline footer `<style>` (fallback), never ~100 per-block `<style>` tags in the body. This removes the ~33KB / ~100-tag body bloat measured on page 8 (2026-07-12) and makes the per-instance CSS browser-cacheable.
- **Editor parity:** because preset CSS is in `style.css` (loaded in the editor via `editorStyle`/`style`), the editor and frontend match with no render.php-emitted stylesheet (which the editor would not show). Override vars set on the element apply in both.
- **Accessibility:** hover rules MUST also cover `:focus-visible`; contrast is a snapshot-data concern, kept correctable because overrides are low-specificity var values, not an ID/`!important` ceiling.

## 6. Architecture

Flow (button = reference implementation):

```
draft .sgs-button--primary{…}:hover{…}
        │  (FR-32-7 extractor)
        ▼
snapshot settings.custom.buttonPresets.primary.{background,text,border,hover-*}
        │  (push-theme-snapshot → wp_global_styles; WP auto-generates vars)
        ▼
:root { --wp--custom--button-presets--primary--background: var(--wp--preset--color--primary); … }
        │  (block style.css consumes, FR-32-2/3)
        ▼
.sgs-button--primary { background: var(--wp--custom--button-presets--primary--background, var(--wp--preset--color--primary)); }
.sgs-button--primary:hover { … hover-* tokens … }
        ▲
converter emits <a class="sgs-button sgs-button--primary">  (FR-32-8, clean HTML)
per-instance override → scoped rule .{uid}.sgs-button{ --sgs-button-background:#xyz }  (FR-32-4, scoped value — NOT inline style=, amended 2026-07-18/D345)
```

Key decisions:
- **BEM class, not `.is-style-*`.** Semantic, matches the draft, and needs no `register_block_style` registration (the pipeline sets the modifier class directly; a manual author sets it via a simple inspector control).
- **Tokens via `settings.custom`, not a bespoke generator.** WP already emits the vars from the snapshot — zero generation code (Spec 11 D24 proven; live-verified 2026-07-07).
- **Framework default = a theme token (`--wp--preset--color--*`), never a client hex** — so a fresh block is neutral-correct and re-skins with the palette.

## 6.1 Geometry token families / box-object contract (added 2026-07-09, `no-inline-styling-design-gate` + `box-object-interface-contract`; ROLLOUT ONGOING)

**Rollout status (D293–D296, 2026-07-09):** the mechanism is LANDED on `sgs/container` + `sgs/button` (D292/D293), `sgs/heading` + `sgs/text` (D293), `sgs/quote` + `sgs/media` (D294), and `sgs/hero` (D295 — its 5 per-area families `contentPadding`/`mediaPadding`/`imagePadding`/`imageBorderWidth`/`imageBorderRadius` + `contentBandPadding` are now migrated objects). The shared `SGS_Container_Wrapper` is itself fully no-inline (base spacing D292, max-width/contentWidth/band D294, grid/flex D296 all scoped). **Pattern selector (D294):** content-KIND composites that use only box+width go BLOCK-PRIVATE (like quote); section/layout composites keep the wrapper (like hero) — see Spec 31 FR-31-21.1. **ROLLOUT COMPLETE (D346, 2026-07-18).** The framework-wide inline-zero drive is DONE: both live sites (palestine-lives Indus + sandybrown Mama's) render EVERY `sgs/*` block with ZERO inline `style` attributes (verified live — page-wide `style="--"`=0, empty `style=""`=0). The remaining surface was cleared by (a) the two-facet shared-`SGS_Container_Wrapper` change (Facet A: emit the `style` key only when non-empty → kills empty `style=""` on every content-KIND composite + header/footer; Facet B: route `$styles` `--var` VALUES to a scoped `.$uid{…}` rule) and (b) block-private conversions of the residual blocks (info-box/icon/testimonial/button/cart/option-picker/audio/collapsible-text/responsive-logo/mega-menu). Every affected `[style*="--sgs-*"]` presence-selector was rewritten to `var(--x,<resting>)` inert fallbacks (GOTCHA F). See D346 + `reports/visual-diff/*-2026-07-18.md`. Only remaining follow-up: a structural anti-regression prebuild gate (deferred to a new session). `P-NOINLINE-ROSTER-RECOUNT` resolved.

**Box-family completeness (2026-07-23, `77703100`):** `sgs/product-card` was the last block still expressing padding as an ad-hoc AXIS PAIR (`ctaPaddingX`/`ctaPaddingY`, two scalars) rather than the `{top,right,bottom,left}` object standard — migrated to a single `ctaPadding` object attr in `supports.sgs.boxFamilies` (mirrors `sgs/button`). Non-visual (empty-object default falls through to the `.sgs-button` base 14px 24px). Every SGS block now uses the box-object standard for multi-side box props. This also fed the cloning-pipeline seeding work (`css_layer` L1-L4 declarative seeding + `css_element`→`wrapper` normalisation + the P3a/P4 declarative resolvers — see Spec 31 §4) which depends on box-family consistency to route padding without collision.

Section 6 covers colour/typography preset tokens (`{component}Presets`). This section covers the SIBLING geometry mechanism — spacing/border shape — that the same no-inline drive proved out. It reconciles two things Bean flagged mid-design: (1) the base layer of every block declaring a WP styling `support` inlines by default via `get_block_wrapper_attributes()` — the fix is to **keep the support** and change WHERE it serialises, never to drop it; (2) 8 four-side + 2 four-corner attr families were flat per-side/per-corner attrs, which is neither the standard WP editor shape nor mergeable/re-skinnable cleanly.

### (a) The named-object shape + WP `BoxControl`
A merged box family is ONE attribute of `"type": "object"` holding named keys — WP's own `BoxControlValue` shape (verified in Gutenberg docs, no bespoke positional-array/index-map needed):
- **4-side families** → `{ "top": <len>, "right": <len>, "bottom": <len>, "left": <len> }`, consumed via WP's native **`BoxControl`** editor component (linked/unlinked, per-side units, native spacing-preset support).
- **4-corner families** (border-radius) → `{ "topLeft": <len>, "topRight": <len>, "bottomLeft": <len>, "bottomRight": <len> }`, consumed via `__experimentalBorderRadiusControl` / BoxControl corner mode.
- `<len>` = a CSS length string (`"20px"`, `"1.5rem"`, `"0"`) or an absent/empty key = that side unset (falls to CSS default / inherits). The unit is carried inline in each value, so no separate `{attr}Unit` companion attr is needed.
- `default`: `{}` (empty object).

### (b) Base serialises SCOPED, not dropped and not inline
**Correct any "drop the support" framing to "keep the support + `__experimentalSkipSerialization` + serialise scoped."** WordPress's `get_block_wrapper_attributes()` auto-inlines any declared `supports.spacing`/`supports.__experimentalBorder` value — that inlining IS the D291 defect class, not the support's existence. The fix: flip serialisation from auto-inline to scoped, per property, via `__experimentalSkipSerialization`, then write the block's resolved `style.spacing.padding` / `style.border.radius` object to its own **CLASS-LEVEL** scoped selector — `.{$uid}.{block-root-class}` (specificity 0,2,0), **NOT** `#{$uid}` (D303, 2026-07-10) — using the stable core API `wp_style_engine_get_styles($style, ['selector' => $scoped_selector])['css']`, **registered into the shared SGS collector (FR-32-11 / §6.2) on the frontend** (echoed inline only in the editor context). This is exactly how WP core outputs `layout` support (a `.wp-container-{id}` rule, not inline) — not a bespoke SGS mechanism. **Class-level, never ID:** WordPress core (6.6 `:root :where()` = 0-1-0), Kadence, Spectra and GenerateBlocks all keep per-instance styling at low/equal specificity and resolve overrides by SOURCE ORDER, never by ID/`!important` escalation. Emitting per-instance styling at `#uid` would make it un-overridable by the equal-specificity `sgsCustomCss` residual (Spec 31 FR-31-5.2) — the render-precedence defect fixed at D303. Every block therefore emits per-instance styling at class-level; any `#uid` emitter is normalised. `skipSerialization` suppresses only WP's *auto-inline output*; it does NOT stop the `style` attribute being populated, so render.php still reads it to emit the scoped rule. Phase-0-proven live: container base spacing now serialises scoped with zero inline declarations on the rendered element.

### (c) Family roster — merge vs keep-scalar (universal scan of all 74 blocks, 2026-07-09)

**MERGE to a named object (10 families, 2 destination classes):**

| Class | Family | Blocks | Destination |
|---|---|---|---|
| WP-native root (4-side) | `padding{side}` | 9 | base → `style.spacing.padding` object (existing, D250); tiers → SGS `paddingTablet`/`paddingMobile` object |
| WP-native root (4-side) | `margin{side}` | 8 | base → `style.spacing.margin` object; tiers → `marginTablet`/`marginMobile` object |
| SGS custom (4-side) | `borderWidth{side}` | 4 (button/heading/quote/text) | SGS object `borderWidth:{...}` — colour/style stay single scalar attrs (no per-side colour/style family exists) |
| SGS custom (4-side) | `contentBandPadding{side}` | 4 | SGS object + tiers + BoxControl (per-band, not root) |
| SGS custom (4-side) | `contentPadding{side}` | 1 (hero) | SGS object + tiers + BoxControl |
| SGS custom (4-side) | `mediaPadding{side}` | 1 (hero) | SGS object + tiers + BoxControl |
| SGS custom (4-side) | `imagePadding{side}` | 1 (hero) | SGS object + tiers + BoxControl |
| SGS custom (4-side) | `imageBorderWidth{side}` | 1 (hero) | SGS object + BoxControl |
| WP-native root (4-corner) | `borderRadius{TL,TR,BL,BR}` | 5 (button/heading/media/quote/text) | base → `style.border.radius` object `{topLeft,…}`; tiers → `borderRadiusTablet`/`borderRadiusMobile` object |
| SGS custom (4-corner) | `imageBorderRadius{TL,TR,BL,BR}` | 1 (hero) | SGS custom corner object + corner control |

**KEEP scalar (10 families — not box properties, or single-side):**

| Family | Blocks | Why not an object |
|---|---|---|
| `attributionMarginTop` | quote | Single side only — a 4-side BoxControl would show 3 dead controls |
| `headlineMarginBottom` | hero | Single side |
| `subHeadlineMarginBottom` | hero | Single side |
| `labelMarginBottom` | option-picker | Single side |
| `quoteMarginBottom` | testimonial | Single side |
| `shapeDivider{Top,Bottom}` + `…Colour/Flip/Height/Invert` | container/cta-section/hero/trust-bar | Not a box property — two independent decorative SVG slots each with its own sub-settings; `{top,right,bottom,left}` is semantically wrong (no left/right divider). Keep the named-slot structure. |

Note: `sgs/button`/`sgs/heading`/`sgs/quote`/`sgs/text` route border via **CUSTOM attrs** (`supports.__experimentalBorder` is NULL on button) — a different routing path from container's WP-native border support. The categorisation guard is keyed on the DB `box_family` value, never the routing path, so both classes merge correctly under one mechanism (Spec 31 §4/§3.A step 3b).

### (d) FR-32-10 — pipeline extraction + block consumption
**FR-32-10** — The pipeline extracts a draft's per-side/per-corner box CSS into the named-object shape: a draft `padding: 12px 18px 12px 18px` (or the equivalent 4 discrete declarations) resolves to `{ "top": "12px", "right": "18px", "bottom": "12px", "left": "18px" }` on the owning attr (Spec 31 §3.A step 3b's cross-declaration accumulator), never 4 flat attrs. The block consumes the object via the shared responsive **BoxControl** wrapper component in `edit.js` (device-tier switcher selects base/tablet/mobile; `onChange` writes the object) and reads it in `render.php`/the shared helper to emit the scoped rule per (b). *Done when:* an asymmetric draft box (4 distinct side values) round-trips to 4 distinct correct computed values live, and the editor BoxControl preview matches the frontend (Pilot Acceptance Test A3/A3b/A8/A9, `no-inline-styling-design-gate.md`).

### (e) Per-instance override channel
Consistent with FR-32-4: a per-instance override on a box-object property is a CSS custom-property **VALUE**, never an inline property declaration. The **only** non-attr styling output permitted anywhere in this contract is a genuinely non-device-tier breakpoint rule (Spec 31 FR-31-5.2's `ResidualBand`), which is the sole legitimate use of the block's `sgsCustomCss` (Additional-CSS) field — every other override flows through the object attr + scoped `<style>`, never a bespoke inline escape hatch.

## 6.2 CSS output consolidation (added 2026-07-12; FR-32-11; `P-STYLE-TAG-CONSOLIDATION`)

**Design status: BUILT + LANDED 2026-07-12** (Bean approved 2026-07-12; `/qc-council`-gated before code; shipped same day — see §(a)/(b)/(d) below for landed evidence). Encodes the collector + file-default output. Full design: `plans/2026-07-12-style-tag-consolidation-design.md` (archived — see `.claude/plans/archive/`).

**Problem.** §6.1(b)'s scoped `<style>` is emitted per block instance into the page body — live page 8 (2026-07-12): ~100 body `<style>` tags, ~33KB. Compliant (§6.1(b) sanctions the scoped `<style>`) but bloated + non-cacheable. The industry-settled fix (WP core / Kadence / Spectra / GenerateBlocks): register each block's CSS into a central collector; flush once.

### (a) The collector — `includes/class-sgs-css-registry.php` (BUILT + LANDED 2026-07-12)
Implemented as a **single `render_block` chokepoint**, NOT ~60 per-block emit-site edits: a late (`priority 99`) `render_block` filter lifts every `<style>` tag out of each `sgs/*` block's rendered HTML into a per-request buffer (`sgs_collect_css`, deduped by content hash, insertion order preserved for D303 residual-last). This captures all 6 emit shapes the `/qc-council` found — including the container wrapper's prepended tag and `custom-css.php`'s appended residual — **without touching either file**, and is inherently universal (R-31-9). Chosen over the emit-site audit because it dissolves the 6-shapes risk entirely.
- **Editor split (CRITICAL, live-verified):** the lift filter + the head buffer are gated to a genuine front-end render via `sgs_is_frontend_render()` = `! is_admin() && ! wp_is_serving_rest_request()` (WP 6.5+; the naive `! is_admin()` is WRONG — false during REST — which would strip the ServerSideRender editor previews' `<style>` into a buffer that never emits → unstyled canvas). Proven live: the block-renderer REST route (`context=edit`) keeps the block's `<style>` inline; the frontend consolidates.

### (b) Head placement + output modes (operator-selectable; BUILT + LANDED 2026-07-12)
Delivery is a **single output buffer** (`template_redirect`) that places the consolidated CSS into the `<head>` (right before `</head>`, so it follows the block `style.css` links → per-instance overrides win by source order) on EVERY front-end render. Placing it every render makes the output **self-consistent under full-page caching** — the cached HTML always carries the matching link/style — so there is **NO pointer, NO cold/warm transition, and NO cache-freeze** (an earlier generate-then-serve design was **reproduced failing live under the LiteSpeed page cache 2026-07-12** — it froze the cold inline response — and replaced by this unified buffer). Two modes, chosen on **SGS → CSS Output** (`sgs_css_output_mode` option, default `file`; still `apply_filters`-able):
- **`file` (DEFAULT)** — a cached, content-hashed external `<link>` (`/uploads/sgs-css/sgs-<epoch>-<hash>.css`) injected into the head. Cleanest HTML, browser-cacheable (immutable `Cache-Control` via a one-time `.htaccess`), and an optimisation plugin (LiteSpeed/Autoptimize/WP Rocket/Perfmatters — listed with the exact setting on the settings page) can defer/critical-split it. Written atomically (tmp + `rename`); write failure → self-contained inline fallback.
- **`head`** — one inline `<style>` injected into the head (the source draft's own model). Fully self-contained: no external file, no cache dependency, works with zero extra plugins. Recommended when no optimisation plugin is run.
- **Invalidation (file mode) is automatic**: changed CSS → new content hash → new filename → the freshly-rendered HTML links it. A global CSS **epoch** (filename prefix) is bumped on any `save_post` (pages + `wp_template` + `wp_template_part` + `wp_global_styles` + product are all CPTs → covers content/template/global-styles edits) and on plugin deploy (version+mtime signature); each bump purges the LiteSpeed full-page cache (`litespeed_purge_all`, guarded) and GCs orphaned files.

### (c) What does NOT change
CSS **generation** is untouched — every helper (`sgs_typography_css_rule`, `sgs_label_box_css_rule`, `sgs_responsive_css_rule`, `SGS_Container_Wrapper`, …) still builds the same string; the collector only relocates the finished `<style>`. Not a converter/walker/pipeline change → no conformance golden moves (render-side only, STOP-60); no block version bump. Spec 32 §6.1 no-inline compliance is unchanged and improved.

### (d) LANDED evidence (sandybrown page 8, 2026-07-12)
`head` mode: one `<style id="sgs-blocks-collected">` in the head, 0 body tags. `file` mode: one `<link id="sgs-blocks-collected-css">` in the head (immutable-cached), 0 body tags, stable under LiteSpeed page cache (loads 4–7 consistent), correct cascade (link after block CSS). Both: hero/button/label-capsule/trial-tag computed values correct at 375/768/1440, D303 residual precedence intact, 0 console errors, editor canvas still styled.

## 7. Data model

`settings.custom.{component}Presets` (per client snapshot):

```json
{ "settings": { "custom": { "buttonPresets": {
  "primary":   { "background": "var(--wp--preset--color--primary)", "text": "var(--wp--preset--color--text)",
                 "border": "var(--wp--preset--color--primary)", "hover-background": "var(--wp--preset--color--text)",
                 "hover-text": "var(--wp--preset--color--text-inverse)", "hover-border": "var(--wp--preset--color--text)",
                 "border-radius": "10px", "padding": "14px 24px", "font-size": "15px" },
  "secondary": { "background": "transparent", "text": "var(--wp--preset--color--text)", "…": "…" },
  "outline":   { "…": "…" }
} } } }
```

WP var derivation: `settings.custom.buttonPresets.primary.hover-background` → `--wp--custom--button-presets--primary--hover-background` (camelCase → kebab, nested `--`).

## 8. Acceptance criteria

| FR | Metric | Target | How measured |
|---|---|---|---|
| FR-32-1 | Any `style` attribute content on a default button's live element — property declarations OR `--var` values OR empty `style=""` | 0 | Playwright `el.getAttribute('style')` on the homepage (must be null/absent) |
| FR-32-3 | Primary button computed bg/color on `:hover` vs normal | differ | Playwright hover + computed style, all 3 presets |
| FR-32-2/5 | Re-skin: change only snapshot `buttonPresets.primary.text` → live button text colour changes | yes | edit snapshot, push, reload, computed colour |
| FR-32-8 | Cloned naked draft link (no button class) becomes a preset button | never | live DOM: the "find out more" link is not `sgs-button--primary` |
| FR-32-6 | Fresh button with `buttonPresets` absent still renders correct colours | yes | remove key locally, render, inspect |

## 9. Phasing

- **Phase 1 — Button reference implementation (this session).** Restore the token/BEM/var design on `sgs/button`: `style.css` preset classes + `:hover` consuming `buttonPresets` vars; `render.php` emits clean class + no inline colour; converter emits the class + extractor populates the snapshot; naked links stay naked. Verify live (all FR acceptance rows).
- **Phase 2 — Reference block's siblings.** `sgs/multi-button`, `sgs/product-card` CTA (its `cta*` prefixed set → `cardPresets`/reuse), option-picker pills.
- **Phase 3 — Framework-wide sweep.** Audit every block for inline property declarations; migrate to the contract. Add a build-time gate that flags a block emitting an inline colour/geometry declaration (extends `check-hardcoded-render-defaults.js`).

## 10. Migration / deprecations

- **Supersedes the D283 preset-as-seed inline-attr styling model** (Spec 11 2026-07-06 update). The button's OWN "Apply preset" button + render.php's inline colour painting are removed for styling; `inheritStyle` remains only as the variant selector that drives the BEM class. **`src/blocks/button/presets.js` itself is RETAINED** (not deleted) — it is reused by `sgs/product-card`'s CTA "Apply preset" control; only the button block's own consumption of it for styling was removed. Do not treat this file as dead per spec — check its live import graph before touching it. Pre-production (D270 no-deprecations) — existing dev/canary buttons are re-cloned, not migrated.
- Spec 11 §3/§4 styling model is now historical; this spec is the operative styling contract. Spec 11 remains the button's attribute-surface / feature reference.

## 11. Open Questions

| Question | Owner | Due |
|---|---|---|
| Does product-card's `cta*` prefixed set fold into `cardPresets`, or keep a `cta`-scoped token group reused from `buttonPresets`? | Claude | Phase 2 |
| Should the per-instance override var be block-scoped (`--sgs-button-background`) or a shared cross-block name? Block-scoped is proposed. | Claude | Phase 1 build |
| Outline hover border: draft says `var(--primary)` (not `primary-dark`). Keep faithful to draft, or does Bean update the draft to `primary-dark`? | Bean | Phase 1 |
