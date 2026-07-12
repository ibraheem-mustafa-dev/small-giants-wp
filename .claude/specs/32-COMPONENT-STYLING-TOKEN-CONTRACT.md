---
doc_type: spec
spec_id: 32
spec_version: "1.2"
title: Component Styling Token Contract (framework-wide)
project: small-giants-wp
status: active
authors: Claude + Bean
session_date: 2026-07-07
last_verified: 2026-07-12
status_history:
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
| Per-client values flow through `theme.json.settings.custom.*Presets` → WP-generated CSS vars | Spec 11 D24 (proven) | Y |
| Pipeline extracts tokens from the draft; never Claude hand-authoring, never asking Bean for values | Bean 2026-07-07 | Y |

## 4. Functional Requirements

### Component Contract
- **FR-32-1** — Every block MUST render its styleable elements with **semantic BEM classes** (`.sgs-{block}` + `.sgs-{block}--{variant}` + `.sgs-{block}__{element}`). The class is the styling hook; markup carries no colour/geometry values. *Done when:* the emitted HTML `style` attribute contains no colour/border/background/padding property for a block on default settings (grep the live DOM `style=""`).
- **FR-32-2** — A block's `style.css` MUST style each variant by **consuming design tokens** with a framework-default fallback: `.sgs-{block}--{variant} { <prop>: var(--wp--custom--{block}-presets--{variant}--{role}, var(--wp--preset--color--{fallback})); }`. *Done when:* changing only the snapshot token re-skins the block with no block-code change (verified live).
- **FR-32-3** — Hover/focus/active/responsive states MUST be authored as stylesheet rules (`.sgs-{block}--{variant}:hover { … }`, `@media { … }`) consuming the `hover-*` / tier tokens. *Done when:* a preset button changes colour on `:hover` on the live page (computed style before/after hover differ).

### Override Strategy
- **FR-32-4** — A per-instance override (editor-set custom value, or a genuine per-block draft exception) MUST be emitted as a **CSS custom property VALUE** scoped to the instance (`--sgs-{block}-{role}: <value>`), consumed by the block's class rule via `var()`. It MUST NOT be an inline property declaration (`color: …`). Setting a var value inline is permitted (it carries no visual declaration and cannot beat `:hover`). *Done when:* an overridden instance shows the custom value in editor AND frontend, and its `:hover` still works.

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

- **Performance:** static preset CSS lives in the block's enqueued `style.css` (shared, cached) — not per-instance `<style>`. Per-instance override vars add only a tiny inline `--var:value` when actually overridden. **Per-instance scoped CSS (responsive tiers, `:hover`, box/typography rules) is CONSOLIDATED, not scattered** — every block registers into the shared collector (FR-32-11 / §6.2) and the frontend emits ONE cached external stylesheet (default) or one inline footer `<style>` (fallback), never ~100 per-block `<style>` tags in the body. This removes the ~33KB / ~100-tag body bloat measured on page 8 (2026-07-12) and makes the per-instance CSS browser-cacheable.
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
per-instance override → style="--sgs-button-background:#xyz"  (FR-32-4, value not declaration)
```

Key decisions:
- **BEM class, not `.is-style-*`.** Semantic, matches the draft, and needs no `register_block_style` registration (the pipeline sets the modifier class directly; a manual author sets it via a simple inspector control).
- **Tokens via `settings.custom`, not a bespoke generator.** WP already emits the vars from the snapshot — zero generation code (Spec 11 D24 proven; live-verified 2026-07-07).
- **Framework default = a theme token (`--wp--preset--color--*`), never a client hex** — so a fresh block is neutral-correct and re-skins with the palette.

## 6.1 Geometry token families / box-object contract (added 2026-07-09, `no-inline-styling-design-gate` + `box-object-interface-contract`; ROLLOUT ONGOING)

**Rollout status (D293–D296, 2026-07-09):** the mechanism is LANDED on `sgs/container` + `sgs/button` (D292/D293), `sgs/heading` + `sgs/text` (D293), `sgs/quote` + `sgs/media` (D294), and `sgs/hero` (D295 — its 5 per-area families `contentPadding`/`mediaPadding`/`imagePadding`/`imageBorderWidth`/`imageBorderRadius` + `contentBandPadding` are now migrated objects). The shared `SGS_Container_Wrapper` is itself fully no-inline (base spacing D292, max-width/contentWidth/band D294, grid/flex D296 all scoped). **Pattern selector (D294):** content-KIND composites that use only box+width go BLOCK-PRIVATE (like quote); section/layout composites keep the wrapper (like hero) — see Spec 31 FR-31-21.1. **~52 of 59 styling-support blocks remain** (phased waves — `.claude/next-session-prompt.md`).

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

**Design status: DESIGN-APPROVED, build-pending** (Bean approved 2026-07-12; `/qc-council`-gated before code). Encodes the collector + file-default output. Full design: `plans/2026-07-12-style-tag-consolidation-design.md`.

**Problem.** §6.1(b)'s scoped `<style>` is emitted per block instance into the page body — live page 8 (2026-07-12): ~100 body `<style>` tags, ~33KB. Compliant (§6.1(b) sanctions the scoped `<style>`) but bloated + non-cacheable. The industry-settled fix (WP core / Kadence / Spectra / GenerateBlocks): register each block's CSS into a central collector; flush once.

### (a) The collector — `includes/class-sgs-css-registry.php`
- `sgs_collect_css( string $uid, string $css ): void` — every emit-site calls this on the frontend **instead of** echoing its own `<style>`. Internally a per-request `static $buffer` keyed by `$uid` (deduped — identical instances share a deterministic `md5(attributes)` uid). Insertion order preserved (residual-last per uid, D303).
- `sgs_flush_collected_css()` — the frontend flush. Emits ONE consolidated stylesheet.
- **Editor split (CRITICAL):** ServerSideRender / the block-renderer REST route has no `wp_footer`, so the collector is gated to the frontend. **The predicate is `! is_admin() && ! wp_is_serving_rest_request()` (WP 6.5+; the naive `! is_admin()` is WRONG — `is_admin()` is false during REST, which would route the 8 ServerSideRender blocks' editor previews into a buffer that never flushes → unstyled editor canvas; `/qc-council` 2026-07-12).** The editor keeps inline per-block emission unchanged, matching how WP core keeps block-supports inline in the editor and stores on `wp_footer` on the frontend.
- **Collector implementation invariants (`/qc-council` 2026-07-12):** (a) the emit swap is a per-block **AUDIT across 6 distinct emit shapes** (immediate-printf, id-less inline-echo, variable-reassigned-then-used, prepend-outside-wrapper, wrapper-internal, and the `custom-css.php` `render_block`-hook residual with its own uid namespace) — NOT a mechanical find/replace; (b) the flush is **pure insertion-order `foreach`** (no sort/group/`unset`+reinsert) so D303 residual-last ordering survives; (c) the collector is **append-safe per uid** so a second legitimate call for one uid never drops the first payload.

### (b) Output modes — default `file`, fallback `inline`
`sgs_css_output_mode` filter → `file` (default) | `inline`.
- **`file` (DEFAULT) — generate-then-serve, head-enqueued.** On `wp_enqueue_scripts` (head), read a per-content pointer (post-meta `_sgs_css_file` = `{hash,url}` for singular; a **request-identity-keyed** transient for non-singular — URL path + normalised query vars, never one shared transient). Pointer present + epoch current → `wp_enqueue_style('sgs-page-css', $url, <block-style deps>, null)` in the `<head>`, at a priority (or with `$deps`) proven live to print AFTER every block's `style.css` (no FOUC, browser-cacheable, HTML ~33KB lighter). Pointer absent/stale → THIS load emits the inline footer `<style>` (always correct) AND `sgs_flush_collected_css()` **atomically** writes (tmp + `rename`) `/uploads/sgs-css/<epoch>-<hash>.css` + stores the pointer; the next load serves from head. Uploads not writable (**cached** check) → permanently fall back to inline (never a broken page).
- **Invalidation = a global CSS EPOCH, not just `save_post` (`/qc-council` 2026-07-12).** `save_post` alone misses global-styles / theme-snapshot / template-part / plugin-deploy changes that alter CSS without touching a page's `post_content`, and under LiteSpeed full-page cache a frozen inline response means the head-enqueue path never re-runs until the cache is purged. So: an epoch value (bumped on `save_post`, template/template-part save, global-styles/snapshot push, and plugin deploy) is baked into the pointer + filename so a bump orphans all stale pointers by construction; invalidation ALSO fires `litespeed_purge_post` (mirroring `includes/class-cart-cache-purge.php`, which already learned this lesson). Hashed files carry immutable `Cache-Control` headers + a GC/expiry policy for orphans. **Reference implementation for the staleness discipline: `class-cart-cache-purge.php` (best-effort hooks + authoritative render-time staleness guard).**
- **`inline` (fallback / opt-out) — one footer `<style>`.** `sgs_flush_collected_css()` prints `<style id="sgs-blocks-collected">…wp_strip_all_tags(...)…</style>` on `wp_footer`.

### (c) What does NOT change
CSS **generation** is untouched — every helper (`sgs_typography_css_rule`, `sgs_label_box_css_rule`, `sgs_responsive_css_rule`, `SGS_Container_Wrapper`, …) still builds the same string; only the emit **tail** redirects from an inline `<style>` to `sgs_collect_css()`. Not a converter/walker/pipeline change → no conformance golden moves (render-side only, STOP-60); no block version bump (render-side lands fresh on reclone). Spec 32 §6.1 no-inline compliance is unchanged and improved.

### (d) FOUC note
Layout-critical base CSS lives in each block's enqueued `style.css` (head); the collected scoped CSS is per-instance overrides / responsive tiers. In `file` mode (default) these load in the head → no flash. In `inline` fallback the footer `<style>` applies after first paint (minor, WP-core-accepted for block-supports). Output-buffer head-injection is a proven-need-only escalation, not built by default.

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
| FR-32-1 | Colour/geometry props in a default button's live `style=""` | 0 | Playwright `el.getAttribute('style')` on the homepage |
| FR-32-3 | Primary button computed bg/color on `:hover` vs normal | differ | Playwright hover + computed style, all 3 presets |
| FR-32-2/5 | Re-skin: change only snapshot `buttonPresets.primary.text` → live button text colour changes | yes | edit snapshot, push, reload, computed colour |
| FR-32-8 | Cloned naked draft link (no button class) becomes a preset button | never | live DOM: the "find out more" link is not `sgs-button--primary` |
| FR-32-6 | Fresh button with `buttonPresets` absent still renders correct colours | yes | remove key locally, render, inspect |

## 9. Phasing

- **Phase 1 — Button reference implementation (this session).** Restore the token/BEM/var design on `sgs/button`: `style.css` preset classes + `:hover` consuming `buttonPresets` vars; `render.php` emits clean class + no inline colour; converter emits the class + extractor populates the snapshot; naked links stay naked. Verify live (all FR acceptance rows).
- **Phase 2 — Reference block's siblings.** `sgs/multi-button`, `sgs/product-card` CTA (its `cta*` prefixed set → `cardPresets`/reuse), option-picker pills.
- **Phase 3 — Framework-wide sweep.** Audit every block for inline property declarations; migrate to the contract. Add a build-time gate that flags a block emitting an inline colour/geometry declaration (extends `check-hardcoded-render-defaults.js`).

## 10. Migration / deprecations

- **Supersedes the D283 preset-as-seed inline-attr styling model** (Spec 11 2026-07-06 update). `src/blocks/button/presets.js` + the "Apply preset" button + render.php's inline colour painting are removed for styling; `inheritStyle` remains only as the variant selector that drives the BEM class. Pre-production (D270 no-deprecations) — existing dev/canary buttons are re-cloned, not migrated.
- Spec 11 §3/§4 styling model is now historical; this spec is the operative styling contract. Spec 11 remains the button's attribute-surface / feature reference.

## 11. Open Questions

| Question | Owner | Due |
|---|---|---|
| Does product-card's `cta*` prefixed set fold into `cardPresets`, or keep a `cta`-scoped token group reused from `buttonPresets`? | Claude | Phase 2 |
| Should the per-instance override var be block-scoped (`--sgs-button-background`) or a shared cross-block name? Block-scoped is proposed. | Claude | Phase 1 build |
| Outline hover border: draft says `var(--primary)` (not `primary-dark`). Keep faithful to draft, or does Bean update the draft to `primary-dark`? | Bean | Phase 1 |
