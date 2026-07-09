---
doc_type: spec
spec_id: 32
spec_version: "1.0"
title: Component Styling Token Contract (framework-wide)
project: small-giants-wp
status: active
authors: Claude + Bean
session_date: 2026-07-07
last_verified: 2026-07-07
status_history:
  - 2026-07-07: v1.0 — initial spec. Restores + generalises the pre-D283 token/class design (Spec 11 Decision 24) as a framework-wide contract; supersedes the D283 preset-as-seed inline-attr model for styling.
references:
  - .claude/specs/11-SGS-BUTTON-ARCHITECTURE.md
  - .claude/specs/26-SGS-GLOBAL-STYLES-AND-THEMING.md
  - .claude/specs/31-UNIVERSAL-CLONING-PIPELINE.md
  - .claude/plans/2026-07-07-button-external-css-rearchitecture.md
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

## 5. Non-functional requirements

- **Performance:** static preset CSS lives in the block's enqueued `style.css` (shared, cached) — not per-instance `<style>`. Per-instance override vars add only a tiny inline `--var:value` when actually overridden. No per-block `<style>` bloat.
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
