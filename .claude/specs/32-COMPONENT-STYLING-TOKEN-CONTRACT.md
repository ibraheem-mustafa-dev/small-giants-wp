---
doc_type: spec
spec_id: 32
spec_version: "1.5"
title: Component Styling Token Contract (framework-wide)
project: small-giants-wp
status: active
authors: Claude + Bean
session_date: 2026-07-07
last_verified: 2026-08-01
status_history:
  - 2026-08-01: v1.5 — added §12 Palette Token Semantics. The framework had never documented what each `theme.json` colour-preset slug MEANS, so `surface` was doing two contradictory jobs: `theme.json` `styles.color.background` makes it the PAGE substrate, while 33 blocks (74 call sites) also used it as their CARD/PANEL fill fallback — invisible cards wherever a client palette's `surface` isn't white (proven live on Mama's/sandybrown, `surface:#fbf3dc` = body background = testimonial card background). §12 defines substrate (`surface`) vs raised-must-be-seen-separate (`surface-alt`) vs ink-on-colour (`text-inverse`) for all 16 palette slots, and the 74 call sites were swept onto it (this session). Also fixed 3 wrong `border-subtle` fallbacks (`#0D5557` instead of the real `#D4DBE5`) and removed a Mama's-specific `#fbf3dc` hardcode from the client-agnostic `sgs/product-card` block. Spec 33 FR-33-2 amended in parallel (`plugins/sgs-blocks/scripts/theme-extractor/palette.py` `_synthesise_surface_alt`) so a re-extracted snapshot cannot recreate the collision.
  - 2026-07-28: §6.2(a) amended — the injection-class discovery (`f7da5f33`→`a367836b`): four
    `render_block` injectors wrote past the p99 lift's leading-`<style>` assumption, silently
    stripping their own output AND their inline `--var` writes (partly voiding the D346
    inline-zero claim on hover/animation/parallax/image-controls). Fixed via a new shared helper
    (`helpers-scoped-instance-vars.php`); all injectors + the last render-level writer
    (team-member) now route through scoped rules, live-proven. Parked gate-coverage gap:
    `P-NO-INLINE-GATE-COVERAGE-GAPS` (no canary page exercises these instances; 3 non-injector
    inline writers un-triaged).
  - 2026-07-26: v1.4 — no-inline rollout RE-VERIFIED complete (D385). An 11-condition DONE audit (`.claude/reports/2026-07-26-spec32-11-condition-done-audit.md`) confirmed 0 inline-via-render / 0 supports lacking skip-serialization / 0 box-family violations / 0 dead controls across accessible blocks; the `check-element-manifest-conformance.js` GAP count is semantic noise, NOT a work-remaining signal (100%-DONE exemplars carry 23–151 GAPs). Closed the 5 genuine residuals: product-card stale-F3 dead-code, feature-grid device-tier breakpoints, + content-collection/pricing-table/form false-flags via a new element-aware F3-gate exemption (E13, `check-hardcoded-render-defaults.js`: wrapper-root gridTemplateColumns/gap literals on BEM `__sub-elements` are exempt). F3 baseline now = `sgs/mega-menu` (Track 2) only.
  - 2026-07-18: v1.3 — FR-32-4 amended to FORBID inline `--var` (`style="--sgs-…:…"`); per-instance override values MUST emit as a scoped `.{uid}.{block}{--var:…}` rule via the collector, aligning FR-32-4 with the already-newer §6.1(e) + Spec 31 FR-31-22.3. Also tightened FR-32-1 done-when + §8 acceptance row (count ANY `style` content, not just property declarations) and §5/§6 flow-diagram (scoped, not inline `--var`). Closes footprint GOTCHA E (permissive outlier) + GOTCHA F (`[style*="--var"]` selector break). D345. Opens the framework-wide inline-zero rollout (`plans/archive/2026-07-17-phase-inline-zero-rollout.md`).
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

> **Sibling spec (Bean decision, 2026-07-28): Spec 32 and Spec 35 stay SEPARATE, not merged.** Spec 32 (this doc) owns the styling/token EMISSION contract (no-inline, scoped CSS, box-object attrs). Spec 35 owns the block INSPECTOR-UX standard (editor-facing controls). Both gate every block build — read them together.

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

- **FR-32-4a** — **Per-ITEM override values in a repeater block** (added 2026-07-30). FR-32-4's shape — one `.{$uid}.{block-root-class}{ --var: <value>; }` rule — carries exactly ONE value per instance, so it cannot express N different values across N repeater items (per-item icon fill, per-item stagger index, per-item bar percentage). Such values MUST still never ride inline. They are emitted as **one positional scoped rule per item**: `.{$uid} .sgs-{block}__{item}:nth-child(N){ --var: <value>; }`, appended to the same block-owned `<style>` as every other scoped rule. Reference implementation: `sgs/social-icons` per-item brand colour (`social-icons/render.php:458`).
  - **The positional-integrity requirement (load-bearing).** `:nth-child(N)` counts **every element sibling**, not only the addressed items. A rule is therefore correct only if, at the point it is written, N equals the item's real position among its parent's children. Two compositions satisfy this: (a) the items are the **sole** element children of their parent — no `<style>` tag, heading, toggle or caption shares it (the block's own `<style>` must be emitted OUTSIDE the items' parent, as `sgs/gallery`, `sgs/pricing-table`, `sgs/google-reviews` and `sgs/social-icons` all do); or (b) a **derived offset** is added to N, computed from the same variables that compose the parent so it cannot drift.
  - *Rationale:* both failure modes were shipped and caught pre-commit on 2026-07-30. `sgs/card-grid` emitted its scoped `<style>` tags INTO the items' own parent, guaranteeing an offset of ≥1 whenever the staggered feature was active; `sgs/trust-bar` addressed badges that share their parent with the block title, breaking on the block's DEFAULT `autoScroll:false` configuration. Neither is visible to `php -l`, `phpcs`, or any static gate — only a live DOM check catches them.
  - *Done when:* the rendered element carries no `style` attribute, AND a live-DOM check confirms each per-item value lands on the intended item (not its neighbour).

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

**Box-flat scalar migration (2026-07-25 s2 — extends the above).** The "completeness" claim covered attrs already TAGGED `box_family` (the 205 object attrs). A `check-box-flat.py` discovery audit (new gate, informational) found box-object-*capable* attrs still expressed as single SCALARS (never tagged), and triaged the 22 in-scope ones: **11 GENUINE-UPGRADE, 10 DELIBERATE-KEEP, 1 spot-check** (full triage in the 2026-07-25 handoff). DELIBERATE-KEEP = intentionally uniform (pill/tag/badge/icon-circle radius, `sgs/label` radius, brand-strip tile — do NOT convert). **LANDED:** `sgs/card-grid` `cardBorderWidth` scalar → 4-side object via the shared `ResponsiveBoxControl` (`reports/visual-diff/card-grid-2026-07-25.md`, PASS; deployed+md5-verified sandybrown; empty `{}`→`border-width:0` neutral). **`ResponsiveBoxControl` now locks `splitOnAxis={false}`** — linked single value by default, unlink → 4 sides (Bean-confirmed; WP `BoxControl` linked-default confirmed via `/library-docs`). **Remaining genuine box upgrades (deploy-gated):** the shared `GridItemDefaultsPanel` (`container/components/ContainerWrapperControls.js:1106`) → BoxControl covers 8 attrs across container/cta-section/hero/trust-bar in ONE change; `sgs/product-card` `ctaBorderWidth`(=2)/`ctaBorderRadius`(=10) — **seed the object defaults to the uniform value** so they stay visually identical (`object-typed-attr-coerces-flat-to-default` trap). Then one batch `/sgs-update` to seed `box_family`. **Colour-alpha:** proven a NON-ISSUE — SGS colour controls get alpha from the shared `DesignTokenPicker` (`enableAlpha=true` default, no block opts out); 58/60 audit "candidates" were false positives (report fixed to detect the shared component); only `sgs/info-box` hover colours (via `StateToggleControl`, native-supports path) are a single-block edge.

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
| SGS custom (4-side) | `borderWidth{side}` | 8 (button/heading/icon-list/option-picker/process-steps/quote/text/timeline) | SGS object `borderWidth:{...}` — colour/style stay single scalar attrs (no per-side colour/style family exists) |
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

> **⚠ Amendment, 2026-07-28 (`f7da5f33` → `a367836b`) — the injection-class discovery + fix.**
> The p99 lift above assumes every `render_block` filter that writes into a block's markup
> appends AFTER the leading scoped `<style>` tag. Several `render_block` injectors
> (`hover-effects.php`, `animation-attributes.php`, `parallax.php`, `image-controls.php`) instead
> assumed **first-tag-is-root** and inserted their class/attribute/overlay output INSIDE that
> leading `<style>` string — which the p99 lift then silently **stripped along with the style
> tag**, erasing both the injected markup and the evidence it ever ran. Found live via QC
> (`f7da5f33`: the stretched-link overlay never fired on wrapper-styled blocks) and fixed by
> skip-offsetting past the leading `style`/`script` tags before inserting.
> Fixing the offset **resurrected** a second, deeper bug (`9702cf4a`): the same four injectors'
> inline `style="--var:…"` per-instance writes had been silently vanishing into the stripped
> `<style>` tag since the no-inline migrations — meaning (a) the D346 "inline-zero win" was
> **partly vacuous** (the live gate had nothing to catch because the violating markup was already
> being deleted before it could be inspected), and (b) those var-driven features (hover-effects,
> parallax strength, image-controls object-fit) were **functionally dead** on every migrated
> block. Completed properly with a new shared helper, `includes/helpers-scoped-instance-vars.php`
> (reuse-or-mint a scope class + append a scoped `.{class}{--var:…}` rule to the collector, same
> pattern as §6.1(e)), consumed by all three var-writing injectors; `parallax.js` swapped
> `el.style` reads for `getComputedStyle` (cascade-aware). `team-member` (block-private per D294,
> no wrapper) was migrated onto its own scoped rule in `a367836b` — a roster sweep of all 8
> `sgs_transition_vars()` consumers found the other 7 already correct. Live-proven on the canary:
> root `style` attribute null, computed var still present via the lifted CSS.
>
> ⚠ **CORRECTED 2026-07-30 — `team-member` was NOT "the last render-level inline writer".** That
> claim was true only of the sweep that produced it, which was scoped to one helper's 8 consumers.
> A later unscoped sweep across ALL plugin PHP found **14 further sites**: 11 in block `render.php`
> files (the 2026-07-30 audit, `reports/2026-07-30-track1-verification-audit.md`) plus **3 the
> render.php-scoped grep structurally could not see** — `class-sgs-container-wrapper.php` (inline
> `--sgs-svg-opacity` on the SVG-background layer), `class-post-grid-rest.php` (inline card vars on
> every REST-rendered card), and `shape-dividers.php` (inline `height`/`color` — real PROPERTY
> declarations, the more serious FR-32-1 breach). All 14 were migrated to scoped rules the same
> day. **The lesson is the scope of the sweep, not the count:** a claim of "last one" is only as
> wide as the grep that produced it, and the audit's own grep was `render.php`-only.
> **Parked, not silently dropped — `P-NO-INLINE-GATE-COVERAGE-GAPS`:** (1) the live no-inline
> gate's `CANARY_URLS` never exercised a hover/animation-attributed instance, so this whole defect
> class passed the gate **vacuously** for the life of the D346 migration — fix is a permanent
> seeded gate-canary page. (2) the three **non-injector** inline writers
> (container-wrapper, post-grid-rest, shape-dividers) are the ones fixed 2026-07-30 above.

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

## 12. Palette Token Semantics (the colour-role contract) — added 2026-08-01, v1.5

### 12.0 Why this section exists

The framework had 16 named colour-preset slugs in `theme.json` `settings.color.palette` and never wrote
down what each one MEANS. Blocks picked whichever slug "looked about right" per author. The specific
collision this caused: `theme.json` `styles.color.background: var:preset|color|surface` makes `surface`
the PAGE BODY BACKGROUND on every site, while 33 blocks (74 call sites) independently used `surface` as
their own card/panel background fallback — so on any client palette where `surface` isn't white (7 of 8
client snapshots ARE white, which hid the bug), a card painted in `surface` is invisible against a page
also painted in `surface`. Proven live on Mama's/sandybrown (`surface:#fbf3dc`), where `sgs/testimonial`'s
card vanished. This section is the durable fix: every slug gets one meaning, and every future block MUST
pick its background/text fill by role, not by "whichever slug looked closest".

### 12.1 The three-bucket rule for surface/text pairs

| Bucket | Token | Meaning | Use it for |
|---|---|---|---|
| **Substrate** | `surface` | The colour the PAGE ITSELF is painted (`theme.json` `styles.color.background`). | The page/body background only, OR a component that deliberately BLENDS with the page at rest — see §12.4. |
| **Raised** | `surface-alt` | Anything that must sit ON the substrate and be SEEN as visually separate from it. | Card/panel/badge/chip/tile fills, hover/open states that need to look "lifted", skeleton shimmer, avatar/media placeholder boxes. |
| **Inverse ink** | `text-inverse` | Light text/icon colour used AS FOREGROUND on a dark or saturated section/element (primary, accent, success, a dark hero band). | `color:` declarations on text/icons sitting on a coloured or dark fill — NEVER a `background`/`background-color` declaration. |

**The test to apply to any new `surface`/`surface-alt`/`text-inverse` usage:**
1. Is this a `color:` (ink/foreground) declaration on something sitting on a coloured/dark fill? → `text-inverse`.
2. Is this a `background`/`background-color` fill that must read as a DISTINCT layer above the page (a card, panel, badge, hover state, placeholder)? → `surface-alt`.
3. Is this a `background`/`background-color` fill that is DELIBERATELY the same as the page (a flush/bordered component whose shape comes from a `border`, not a fill contrast — see §12.4)? → `surface`.

### 12.2 Full 16-slot palette semantics

| Slug | Value (framework default) | Meaning | Notes |
|---|---|---|---|
| `primary` | `#1F7A7A` | The brand's main interactive/brand colour — buttons, links, active states. | |
| `primary-dark` | `#0F4C4C` | Hover/pressed shade of `primary`. | Also used as a deep-tone section background in some composites. |
| `accent` | `#F59E0B` | The brand's secondary/highlight colour — badges, callouts, secondary CTAs. | Do NOT use `accent` as a text colour on `accent-light` — fails contrast (1.93:1 measured); use `accent-text`. |
| `accent-text` | `#92400E` | The text/border/icon colour paired with `accent-light` panels (a darker shade of the accent hue, chosen for AA contrast — 6.37:1 measured vs `accent`'s 1.93:1). | Established live usage: form field selected-state border/checkmark, notice-banner border, icon hover colour, cart badge text fallback. |
| `accent-light` | `#FEF3C7` | A pale tint of `accent`, used as a RAISED panel/badge fill (same bucket semantics as `surface-alt` but on the accent hue rather than neutral). | Pair with `accent-text` for foreground, never `accent` directly (contrast). |
| `success` | `#2E7D4F` | Positive/confirmation state colour — success badges, validation ticks, "in stock". | Pair with `text-inverse` for foreground text/icons on a `success` fill (see hero `--badge--success`). |
| `error` | `#DC2626` | Negative/validation-failure state colour. | Pair with `text-inverse` (or a dedicated on-error text colour) for foreground on an `error` fill. |
| `whatsapp` | `#25D366` | WhatsApp-brand green, reserved for the WhatsApp CTA block only (brand-mark colour, not a general "success" substitute). | |
| `surface` | `#FAF9F6` | **Substrate** — see §12.1. The page/body background (`theme.json` `styles.color.background`). | Also legitimately used by a component that deliberately blends with the page at rest — §12.4. |
| `surface-alt` | `#F1F0EC` | **Raised** — see §12.1. Anything that must read as a distinct layer above the page. | |
| `text` | `#1A202C` | The default body/heading text colour on a light (`surface`/`surface-alt`) background. | |
| `text-muted` | `#606D80` | A lower-emphasis text colour on a light background — captions, metadata, secondary copy. | |
| `text-inverse` | `#F1F5F9` | **Inverse ink** — see §12.1. Light text/icon colour for use AS FOREGROUND on a dark or saturated fill. | Never used as a `background`/`background-color` value — that is always a bug (it would paint a near-white fill unintentionally). |
| `border-subtle` | `#D4DBE5` | A quiet, low-contrast NEUTRAL divider/border colour — the default `border` on cards, inputs, dividers. | Must stay a desaturated neutral close to the surface tones; a saturated brand-accent value here is a role violation (§12.5 finding 1). |
| `border-light` | `#E5E7EB` | An even lighter neutral border, for subtler internal dividers (e.g. accordion item separators) than `border-subtle`. | |
| `footer-bg` | `#0F172A` | A dedicated dark/deep section background for the site footer (and any block explicitly opting into the footer treatment). | Distinct from `primary-dark` — footer-bg is a NEUTRAL deep tone, not necessarily brand-hued (Indus Foods sets it to `#2c3e50`, unrelated to that client's teal/gold brand pair). Text/links on `footer-bg` use `text-inverse` or a client-specific accessible pairing (see `core-blocks.css` gold-on-footer-bg contrast fix, 4.6:1). |

### 12.3 The 74-site sweep — classification table

Every `--wp--preset--color--surface` / `--surface-alt` background/colour call site in `plugins/sgs-blocks/src/blocks/*/style.css` was read in context and bucketed. `src/blocks/testimonial-slider/**` is explicitly OUT OF SCOPE (owned by another workstream) and was left untouched.

| File:line | Was | Bucket | Fixed to |
|---|---|---|---|
| brand-strip/style.css:152 | `surface` (tile bg) | Raised | `surface-alt` |
| brand-strip/style.css:401 | `surface` (tile hover bg) | Raised | `surface-alt` |
| brand-strip/style.css:366, :371 | `surface` (fade-mask gradient) | Substrate (masks blend into the page — the strip/track itself has no background of its own) | left as `surface` |
| business-info/style.css:258, :267, :271 | `color: surface` (icon/text on primary-filled button) | Inverse ink | `text-inverse` |
| countdown-timer/style.css:18 | `surface` (`--elevated` variant) | Raised | `surface-alt` |
| countdown-timer/style.css:24 | `surface-alt` (`--filled` variant) | Raised (already correct) | unchanged |
| accordion/style.css:46 | `surface` (item header, resting state) | Substrate (flush design; boundary comes from the border, not a fill contrast — see §12.4) | left as `surface` |
| accordion/style.css:57, :64 | `surface-alt` (hover/open state) | Raised (already correct) | unchanged |
| accordion/style.css:229 | `surface` (`.sgs-accordion--card` item) | Raised (explicit "STYLE: CARD" variant) | `surface-alt` |
| button/style.css:88 | `surface-alt` (outline hover bg fallback) | Raised (already correct) | unchanged |
| cta-section/style.css:86, :187, :191, :202, :218, :236 | `color: surface` | Inverse ink | `text-inverse` |
| cta-section/style.css:409 | `surface-alt` (gradient) | Raised (already correct) | unchanged |
| card-grid/style.css:36 | `surface` (card bg) | Raised | `surface-alt` |
| card-grid/style.css:64 | `surface-alt` (hover) | Raised (already correct) | unchanged |
| card-grid/style.css:88, :92 | `color: surface` | Inverse ink | `text-inverse` |
| buybox/style.css:279 | `surface` (`value-ladder` selected row) | Raised | `surface-alt` |
| buybox/style.css:535 | `surface-alt` | Raised (already correct) | unchanged |
| form/style.css:159 | `surface` (input field fill) | Substrate (bordered field, no fill contrast intended) | left as `surface` |
| form/style.css:390, :407, :602 | `surface-alt` (hover/preview-box states) | Raised (already correct) | unchanged |
| google-reviews/style.css:232 | `surface` (review card) | Raised | `surface-alt` |
| google-reviews/style.css:264 | `color: surface` (dark-theme review text) | Inverse ink | `text-inverse` |
| google-reviews/style.css:281 | `surface-alt` (avatar bg) | Raised (already correct) | unchanged |
| google-reviews/style.css:381 | `surface` (badge) | Raised | `surface-alt` |
| hero/style.css:232, :361 | `color: surface` | Inverse ink | `text-inverse` |
| hero/style.css:350 | `surface` (badge default/light bg) | Raised | `surface-alt` |
| info-box/style.css:37 | `surface` (`--elevated` variant) | Raised | `surface-alt` |
| info-box/style.css:43 | `surface-alt` (`--filled` variant) | Raised (already correct) | unchanged |
| modal/style.css:78 | `surface` (dialog panel) | Raised | `surface-alt` |
| option-picker/style.css:456 | `surface` (`--soft` resting pill) | Substrate (deliberately neutral/blend resting state, per its own comment) | left as `surface` |
| product-faq/style.css:23 | `surface` (FAQ item base) | Substrate (same flush pattern as accordion header — border defines shape, hover/open raises to `surface-alt`) | left as `surface` |
| product-faq/style.css:67 | `surface-alt` (hover/open) | Raised (already correct) | unchanged |
| post-grid/style.css:384, :772, :792 | `surface-alt` (card/shimmer) | Raised (already correct) | unchanged |
| product-card/style.css:465, :890, :904 | `color: surface` (badge fg default) | Inverse ink | `text-inverse` |
| product-card/style.css:670, :707, :726 | `surface` with hardcoded `#fbf3dc` fallback (no-image box / media / thumb-strip bg) | Raised, PLUS a Mama's-specific client-colour hardcode in a framework block | `surface-alt` with generic `#f5f7f7` fallback (item 4) |
| product-card/style.css:841 | `surface` (`value-ladder` selected row) | Raised | `surface-alt` |
| product-search/style.css:97, :300 | `surface-alt` | Raised (already correct) | unchanged |
| process-steps/style.css:64 | `color: surface` | Inverse ink | `text-inverse` |
| social-icons/style.css:47, :77 | `color: surface` | Inverse ink | `text-inverse` |
| social-icons/style.css:70 | `surface-alt` (pill bg) | Raised (already correct) | unchanged |
| label/style.css:46, :57 | `color: surface` | Inverse ink | `text-inverse` |
| table-of-contents/style.css:16 | `surface` (`--card` variant) | Raised | `surface-alt` |
| tabs/style.css:374 | `surface-alt` | Raised (already correct) | unchanged |
| team-member/style.css:21 | `surface` (`--elevated` variant) | Raised | `surface-alt` |
| team-member/style.css:31, :68 | `surface-alt` | Raised (already correct) | unchanged |
| testimonial/style.css:195, :268, :317, :337 | `surface` (classic-card / rating-led / corporate-logo / case-study-media variants) | Raised (this was the file the finding was proven on — `classic-card` used `surface` while sibling `pull-quote-editorial` correctly used `surface-alt`) | `surface-alt` |
| testimonial/style.css:223 | `surface-alt` (pull-quote-editorial) | Raised (already correct) | unchanged |
| testimonial-slider/style.css:296 (formerly reported ~261) | `surface` | **OUT OF SCOPE** — owned by another workstream, left untouched | — |
| trust-bar/style.css:69, :116 | `surface-alt` | Raised (already correct) | unchanged |
| trust-bar/style.css:126 | `surface` (badge hover — recedes to page on hover) | Substrate (deliberate toggle: resting = raised `surface-alt`, hover = recede to page) | left as `surface` |

**Total background/colour call sites reviewed: 76 (74 in scope per the brief's count + the 2 fade-mask lines at brand-strip:366/371 which the brief's line-count also covers). 34 changed, 42 confirmed already correct or deliberately left as substrate.**

### 12.4 The "deliberate blend" pattern — when `surface` on a component background is CORRECT, not a bug

A handful of components use `surface` as their OWN resting-state background even though they are not
literally the page. This is legitimate, not an instance of the bug, when BOTH are true:
1. The component's shape/boundary is defined by a `border`, not by a fill contrast against the page.
2. An interaction state (hover/open/selected) explicitly switches the SAME element to `surface-alt` (or
   vice versa) as the visible signal that something changed.

Examples kept as `surface` under this rule: accordion item header at rest (`accordion/style.css:46`,
raises to `surface-alt` on hover/open), the FAQ item base (`product-faq/style.css:23`, same pattern), the
option-picker `--soft` resting pill (`option-picker/style.css:456`, its own comment calls it "a neutral
surface/border-token resting pill"), the form input field fill (`form/style.css:159`, bordered field, no
elevation intended), the trust-bar text-only badge's hover state (`trust-bar/style.css:126`, resting =
raised `surface-alt`, hover recedes to the page), and the brand-strip fade masks (`brand-strip/style.css:
366,371`, which blend the scrolling strip's edges into whatever the STRIP itself sits on — confirmed the
strip/track has no background of its own, so the mask target is correctly the page).

**If a future component wants this pattern, it must satisfy both conditions above — a component that has
no border AND no state-differentiated `surface-alt` counterpart using `surface` as a fill is the ORIGINAL
bug, not this exception.**

### 12.5 Wider palette audit (all 8 client `theme-snapshot.json` files)

Three checks run across every client snapshot against the 16-slot roster in §12.2, reading the actual
`sites/*/theme-snapshot.json` values directly (2026-08-01):

**(a) Slot value doesn't match its role — `border-subtle` set to a saturated brand accent.**
`border-subtle` (§12.2) is meant to be a quiet neutral divider:

| Client | `border-subtle` value | Verdict |
|---|---|---|
| mamas-munches | `#e8d5c0` (warm beige, tan-tinted — leans toward the brand's cream/orange family rather than a true neutral) | Role violation (mild) |
| indus-foods | `#2EADE2` named "Light Blue" in the snapshot | Role violation — a saturated blue, unrelated to Indus's teal/gold brand pair |
| sgs-healthcare | `#4CAF88` named "Border Subtle (Green)" | Role violation |
| sgs-mosque | `#C9A035` named "Border Subtle (Gold)" | Role violation |
| sgs-construction | `#E8700A` named "Border Subtle (Orange)" | Role violation |
| sgs-professional | `#8B4A6B` named "Border Subtle (Plum)" | Role violation |
| eye-care-ward-end | `#C9A84C` named "Border Subtle (Gold)" | Role violation |
| helping-doctors | `#d4e8e4` named plain "Border Subtle" (no colour suffix — the only one that doesn't name itself after a brand hue) | **Correct — the one snapshot that gets this right** |

**(b) Missing slots** — checked the `settings.color.palette` slug set in all 8 `theme-snapshot.json`
files against the 16-slot roster (§12.2). No snapshot is missing a slot.

**(c) Duplicate slot definitions** — no duplicate `slug` entries were found within any single client
snapshot's palette array.

### 12.6 Disposition on client colour changes (constraint: never overwrite a deliberate brand choice)

Per this task's constraint, before changing ANY client's colour the client's own `sites/<client>/CLAUDE.md`
was checked for a documented deliberate reason. Only 4 of the 8 sites in `sites/` currently have their own
CLAUDE.md (`indus-foods`, `snooza-chair`, `small-giants-studio-v2`, `mamas-munches`); the other 4 template/
demo sites (`sgs-healthcare`, `sgs-mosque`, `sgs-construction`, `sgs-professional`, `eye-care-ward-end` —
five, not four; none of the "template" sites has a CLAUDE.md) have no CLAUDE.md at all — the absence of a
doc is itself evidence the saturated `border-subtle` value was never a deliberate brand decision (nothing
to record a decision IN). `indus-foods/CLAUDE.md` DOES list `border-subtle: #2eade2` in its own design-
tokens table (line 26) — but that table is a copy of the SAME framework defaults-table format that was
found stale/drifted in `theme/sgs-theme/CLAUDE.md` (fixed this session) and carries no prose anywhere
explaining `border-subtle` as an intentional brand choice (unlike `primary`/`accent`, which the doc traces
to the client's logo) — read as a LISTED value, not a DOCUMENTED decision. `mamas-munches/CLAUDE.md`
doesn't mention `border-subtle` at all. **This session did NOT overwrite any client's `border-subtle`
value** — per the task's STOP condition, this is reported as a finding for Bean's sign-off rather than
silently corrected, because a colour change to 7 live/near-live client palettes is exactly the kind of
blast-radius change that warrants an explicit go-ahead, not an inferred one. Recommended fix (not yet
applied): re-derive each palette's `border-subtle` as a low-chroma neutral near that site's
`surface`/`surface-alt` tones, the way `helping-doctors` already has it, once Bean confirms none of the 7
want to keep the saturated look.

**Related finding — `surface-alt` distinctness (item 5 of this task).** Reading the actual snapshot
values: `mamas-munches` (`surface:#fbf3dc`, `surface-alt:#fff9f0` — RGB delta only (4,6,20), the weakest
of all 8) and `sgs-professional` (`surface:#FFFFFF`, `surface-alt:#F8F7F9` — delta (7,8,6)) are the two
most weakly-differentiated pairs; `sgs-construction` (delta (10,12,15)) and `indus-foods` (delta (7,8,11))
are also subtle but a shade more visible. The rest (`helping-doctors`, `eye-care-ward-end`, `sgs-mosque`,
`sgs-healthcare`) are more clearly distinct. **Not edited this session** — `mamas-munches` is the one
proven-live site with its own CLAUDE.md, and its `surface-alt` value is a DECLARED token in the source
draft HTML (not something the extractor derived), so silently changing it would be overwriting draft
content rather than fixing an extraction bug. Flagged for Bean: if the swept blocks (§12.3) still look
under-differentiated on the live canary once deployed, the fix is a value change to
`sites/mamas-munches/theme-snapshot.json` (and, properly, the source draft's `--surface-alt` declaration),
not a further code sweep.

### 12.7 Verification method (rule 4a — computed, content-keyed, not source-diff) + extractor proof

Per the project's binding measurement rule, "does the fix work" for a CODE change means computed styles of
the rendered element, not a diff of source declarations. The block-level sweep (§12.3) is a source-level
token swap (fallback-chain reads through to the same computed value in every browser — no measurement
ambiguity); it is straightforward to confirm by re-deploying and reading `getComputedStyle` on the swept
elements against the intended slug's resolved hex, which is Bean's/the deploy owner's normal post-deploy
step (this session did not deploy — see repo-wide deploy-ownership note).

**The load-bearing extractor fix (Spec 33 FR-33-2, `plugins/sgs-blocks/scripts/theme-extractor/palette.py`
`_synthesise_surface_alt`) was proven directly against the extraction code, not by inference:**
- `python -m pytest tests/test_extractor.py` in `theme-extractor/`: 25/26 green both before and after the
  fix (the 1 failure is a pre-existing, unrelated `styles.elements` fontSize mismatch, confirmed identical
  via `git stash` before/after — not touched by this work).
- The D318 regression guard (`test_client_colour_keeps_raw_token_slug_not_custom`) — which a first attempt
  at this fix broke by letting the `surface-alt` role claim a slug at high confidence — passes clean with
  the final fix (kept the role's confidence low + added a nothing-claimed-it-yet synthesis fallback
  instead of an identity-claim).
- Direct proof the collision is gone: a synthetic single-background draft with NO content/card background
  signal at all (previously the exact scenario that reproduces the bug) now emits, instead of a missing or
  colliding slot:
  - dark surface `#222831` → synthesised `surface-alt` = `#2f353d` (`_source: "derived"`)
  - light surface `#fbf3dc` (Mama's own hex) → synthesised `surface-alt` = `#ece4cf` (`_source: "derived"`)
