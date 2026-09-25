---
doc_type: spec
spec_id: 32
spec_version: "1.10"
title: Component Styling Token Contract (framework-wide)
project: small-giants-wp
status: active
authors: Claude + Bean
last_verified: 2026-09-19
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

⛔ **MORE THAN 3 BLOCKS? BUILD THE DETECTOR FIRST — read
`.claude/THE-MIGRATION-METHOD.md` before the 4th file edit.** A census-driven pass moves the corrections out of the tree and into the detector, where one commit fixes hundreds of sites. Figures + derivation live in ONE place — do not copy them here. What decides the outcome is whether the TARGET SHAPE is settled first (THE-MIGRATION-METHOD.md Step 3).

> **One-liner:** Every SGS block styles itself with semantic BEM classes that CONSUME per-client design tokens (CSS custom properties auto-generated from the theme snapshot) — never hardcoded client values, never inline property declarations — so the same block library re-skins across any client by changing `theme.json`/the snapshot alone.

> **Sibling spec:** Spec 32 (this doc) owns the styling/token EMISSION contract (no-inline, scoped CSS, box-object attrs). Spec 35 owns the block INSPECTOR-UX standard (editor-facing controls). The two are separate documents; both gate every block build — read them together.

## 0a. Verified implementation status — per requirement

> Every row carries a verdict backed by a command. ⛔ **Re-derive before quoting.** This table is itself a cache.
> Live fixture for the repeater + box-object points: canary page `/s1-probe-spec32/` (id 2502).

| Requirement | Status | Evidence |
|---|---|---|
| **FR-32-1** no inline `style` content | ✅ **DONE** | `node plugins/sgs-blocks/scripts/audit-inline-styling.js --check` → 0 violations across all blocks, exit 0 |
| **FR-32-2** style.css consumes `--wp--custom--{block}-presets--*` | ✅ DONE | `plugins/sgs-blocks/src/blocks/button/style.css::.sgs-button--primary` |
| **FR-32-3** hover/focus are stylesheet rules | ✅ **DONE** | `--sgs-btn-*-hover` per preset; live re-run: hover computed values differ from resting |
| **FR-32-4** per-instance override is a scoped rule, never inline `--var` | ✅ **DONE — live-proven** | `/s1-probe-spec32/`: per-item `--sgs-*` VALUES in scoped rules; **0 inline `style` attributes across 150 `sgs-` elements**; `helpers-scoped-instance-vars.php` |
| **FR-32-4a** per-item repeater override uses `:nth-child(N)` with positional integrity | ✅ **DONE — positional integrity live-proven** | **SIX** emitters: `card-grid`, `gallery`, `google-reviews`, `pricing-table`, `social-icons`, `trust-bar` (`cta-section` mentions `nth-child` in a comment and emits none). Proven on `/s1-probe-spec32/` in the **default** `autoScroll:false` + title case: parent children are `[title, badge, badge, badge]`, badges resolve to `nth-child(2/3/4)`, and each computed fill lands on its intended badge **matched by label, not position** |
| **FR-32-5** per-client tokens at `settings.custom.{component}Presets` | ✅ **DONE** | The MECHANISM is complete and live-proven: editing only `buttonPresets.primary.text` in the snapshot moved the live button `rgb(58,46,38)` → `rgb(255,0,255)` with no block-code change, then reverted cleanly. **Adoption is not completeness** — the snapshots carrying `buttonPresets` are the real client builds; the template/demo sites render correctly on the FR-32-6 fallback (§8, FR-32-6 row). A count of who has *used* a mechanism is not a measure of whether it *works* |
| **FR-32-6** fallback is always a theme token, never a client hex | ✅ DONE | `plugins/sgs-blocks/src/blocks/button/style.css::.sgs-button--primary` carries no hex literals; snapshots without `buttonPresets` run on the fallback path |
| **FR-32-7** pipeline extractor lifts draft CSS into `buttonPresets` | ✅ DONE | `scripts/extract-button-presets.py` |
| **FR-32-8** converter emits the semantic variant class; naked link stays naked | ✅ **DONE** | `converter/recognition.py` DB-driven; `tests/test_button_preset_seed.py`; live DOM re-run |
| **FR-32-9** `{component}Presets` namespace + fixed role vocabulary + **lint/grep check per component** | ✅ **DONE** | Verifiers: **`scripts/check-preset-token-naming.py`** and **`scripts/check-palette-slug-refs.py`**, both wired into `prebuild`; both ship a `--self-test` that plants a known violation and asserts rejection. Only one component instantiates a group (`product-card`'s CTA reuses `buttonPresets` — §11 Q1); that is a usage fact, not a gap |
| **FR-32-10** pipeline extraction + block consumption (box families) | ✅ **DONE — both halves live-proven** | Frontend: an asymmetric 4-side box round-trips to **4 distinct computed values** (`11/22/33/44px`) via a scoped rule, `style` attribute null. Editor: the `context=edit` render agrees on all 4 sides **and** the tablet tier, negative-controlled (changing one side breaks parity, proving the check can fail) |
| **FR-32-11** blocks register scoped CSS into the shared collector | ✅ **DONE** | `class-sgs-css-registry.php`. Most `render.php` files echo their own `<style>` (`git grep -l '<style' -- 'plugins/sgs-blocks/src/blocks/*/render.php'`), which is CORRECT: §6.2(a) designs a single `render_block` priority-99 chokepoint that lifts them, explicitly "NOT ~60 per-block emit-site edits". Only one caller of `sgs_collect_css()` exists, by design |

**§8 Acceptance criteria — all five measured live** on the canary; see §8 for the per-row evidence.

**Open items.**

1. **§12.6 palette values** — client `border` values that are saturated brand hues, and the `surface-alt` distinctness question. Both are per-client `theme-snapshot.json` VALUE changes awaiting Bean, not code.

`sgs/mega-panel` root border uses `SgsBorderControl` (width + colour + style); its radius stays a scalar attribute, because folding it into the control's corner-object radius would be a stored-shape migration against live content, not a control-shape swap.

## 0. Problem statement

SGS is a reusable component library driven by a cloning pipeline, not a manual-authoring plugin. Two failure modes make a block un-reusable and buggy, and this contract prevents both:

1. **Inline property declarations.** A `render.php` that bakes colour/border values into the element's `style=""` fails twice: inline styles (specificity 1,0,0,0) beat every stylesheet rule including `:hover`, so hover silently dies, and they bake client brand into block markup, so the block cannot re-skin per client.
2. **No shared styling contract.** Without one, each block invents its own approach (inline attrs here, `.is-style-*` there, prefixed helpers elsewhere), and a new block has no single pattern to follow.

The design is a semantic BEM variant class consuming `--wp--custom--{component}-presets--*` vars that WordPress auto-generates from `theme.json.settings.custom`. Those vars are emitted at `:root` on live sites; `render.php` must never bypass them by painting inline.

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
- WordPress Block Style Variations (`register_block_style` + theme.json variations). Rejected: they optimise for MANUAL authoring (editor Styles switcher, client self-service editing) which a pipeline-driven, auto-preset-determined library does not need; they add pipeline-mapping friction + WP-cascade coupling for ~zero gain here. (Research: `.claude/plans/2026-07-07-button-external-css-rearchitecture.md`.)
- Editor Global-Styles self-service preset editing (clients do not author; Bean QCs).

## 3. Hard constraints

| Constraint | Source | Non-negotiable |
|---|---|---|
| No block setting is ever emitted as an inline `style=""` property declaration | Owner rule | Y |
| Hover/focus/active/responsive states live in a stylesheet rule only | CSS (inline cannot express pseudo/`@media`) + Spec 31 R-31-6 | Y |
| No client brand value (hex/token slug/px) hardcoded in block PHP/JS/CSS | Owner rule | Y |
| **THE DEFAULT-vs-HARDCODE TEST — the question is NOT "is it a literal?" but "does it override a theme-wide default, or hinder the pipeline?"** A block literal that **duplicates a `theme.json styles.elements` default is a SILENT OVERRIDE that disables the theme** — check theme.json BEFORE adding any typography literal to a block. A component's OWN constant that overrides no theme-wide default and stays per-instance overridable **STAYS**. `null`/`''` default = inherit is the canonical pattern. | **Owner rule** | Y |
| Per-client values flow through `theme.json.settings.custom.*Presets` → WP-generated CSS vars | Spec 11 D24 (proven) | Y |
| Pipeline extracts tokens from the draft; never Claude hand-authoring, never asking Bean for values | Owner rule | Y |

## 4. Functional Requirements

### Component Contract
- **FR-32-1** — Every block MUST render its styleable elements with **semantic BEM classes** (`.sgs-{block}` + `.sgs-{block}--{variant}` + `.sgs-{block}__{element}`). The class is the styling hook; markup carries no colour/geometry values. *Done when:* the emitted HTML carries **no `style` attribute at all** on the block's rendered elements — neither a property declaration (`color:…`) NOR a custom-property value (`--sgs-…:…`) NOR an empty `style=""` (grep the live DOM: 0 `style="` on `sgs/*` elements). *(Counting only property declarations would silently permit inline `--var`.)*
- **FR-32-2** — A block's `style.css` MUST style each variant by **consuming design tokens** with a framework-default fallback: `.sgs-{block}--{variant} { <prop>: var(--wp--custom--{block}-presets--{variant}--{role}, var(--wp--preset--color--{fallback})); }`. *Done when:* changing only the snapshot token re-skins the block with no block-code change (verified live).
- **FR-32-3** — Hover/focus/active/responsive states MUST be authored as stylesheet rules (`.sgs-{block}--{variant}:hover { … }`, `@media { … }`) consuming the `hover-*` / tier tokens. *Done when:* a preset button changes colour on `:hover` on the live page (computed style before/after hover differ).

  ⭐ **CANONICAL EMITTER for hover COLOUR: `sgs_emit_state_colour_css( $selector, $decls_normal, $decls_hover )`** in `includes/helpers-tokens.php`, modelled on `sgs_border_gradient_css()`. It emits `{$selector}:hover,{$selector}:focus-visible{…}` as real declarations on the block's own scoped selector, and returns `''` when nothing is set so an unset instance renders byte-identical CSS to before it existed.

  Blocks routing through the helper: `info-box`, `hero`, `process-steps`, `cta-section`, `post-grid`, `card-grid`, `testimonial`, `testimonial-slider`. A block does not write `--sgs-hover-bg/text/border` custom-property VALUES for a static `style.css` rule to read back through `var()`.

  ⛔ **`sgs/button` is EXEMPT** — its `--sgs-btn-*-hover` vars feed a static `style.css` rule AND three preset classes with `theme.json` fallback chains, which is the mechanism this very requirement describes. Do not "finish the job" and break the preset cascade; the exemption is recorded in the helper's own docblock.

  ⚠ Unset means no hover: no block injects a hardcoded `var(…, <fallback>)` default that overrides the operator's own setting. An injected default that overrides the operator's own setting is a cheat to remove, not a behaviour to preserve.

  ⚠ Descendant-hover is the ONE shape the helper does not cover: it appends `:hover` to the selector it is given, so where hovering a PARENT must recolour children that carry their own explicit resting colour (`sgs/post-grid`), the rule is hand-built to the same contract and pairs `:focus-within` rather than `:focus-visible`, because the focusable element is a descendant.

### Override Strategy
- **FR-32-4** — A per-instance override (editor-set custom value, or a genuine per-block draft exception) MUST be emitted as a **CSS custom property VALUE** scoped to the instance (`--sgs-{block}-{role}: <value>`), consumed by the block's class rule via `var()`. It MUST NOT be an inline property declaration (`color: …`). **The custom property itself MUST NOT be emitted inline either (`style="--sgs-{block}-{role}: <value>"` is FORBIDDEN on the frontend):** the per-instance value MUST be written as a scoped `.{$uid}.{block-root-class}{ --sgs-{block}-{role}: <value>; }` rule in the block's own `<style>`, registered into the shared SGS collector (FR-32-11 / §6.2). *(Rationale: even a bare inline `--var` (a) leaves a `style` attribute on the rendered element, which the framework-wide gate treats as a violation, and (b) silently breaks any CSS rule that gates on an inline-attribute-presence selector `[style*="--var"]` the moment the value moves scoped. It also loses nothing: the scoped custom-property VALUE still cannot beat `:hover` and applies identically. This is consistent with §6.1(e) and Spec 31 FR-31-22.3.)* The **only** permitted non-attr, non-scoped-`<style>` styling output anywhere in this contract is the documented `sgsCustomCss` residual (§6.1(e) / Spec 31 FR-31-5.2), and even that is a scoped stylesheet rule, never an inline `style=` attribute. *Done when:* an overridden instance shows the custom value in editor AND frontend, its `:hover` still works, AND the rendered element carries NO `style` attribute (grep the live DOM: 0 `style="--` on `sgs/*` elements).

- **FR-32-4a** — **Per-ITEM override values in a repeater block.** FR-32-4's shape — one `.{$uid}.{block-root-class}{ --var: <value>; }` rule — carries exactly ONE value per instance, so it cannot express N different values across N repeater items (per-item icon fill, per-item stagger index, per-item bar percentage). Such values MUST still never ride inline. They are emitted as **one positional scoped rule per item**: `.{$uid} .sgs-{block}__{item}:nth-child(N){ --var: <value>; }`, appended to the same block-owned `<style>` as every other scoped rule. Reference implementation: `sgs/social-icons` per-item brand colour (`plugins/sgs-blocks/src/blocks/social-icons/render.php::$scoped_css`).
  - **The positional-integrity requirement (load-bearing).** `:nth-child(N)` counts **every element sibling**, not only the addressed items. A rule is therefore correct only if, at the point it is written, N equals the item's real position among its parent's children. Two compositions satisfy this: (a) the items are the **sole** element children of their parent — no `<style>` tag, heading, toggle or caption shares it (the block's own `<style>` must be emitted OUTSIDE the items' parent, as `sgs/gallery`, `sgs/pricing-table`, `sgs/google-reviews` and `sgs/social-icons` all do); or (b) a **derived offset** is added to N, computed from the same variables that compose the parent so it cannot drift.
  - *Rationale:* two failure modes exist. A block that emits its scoped `<style>` tags INTO the items' own parent (`sgs/card-grid`) guarantees an offset of ≥1 whenever a staggered feature is active; a block whose badges share their parent with the block title (`sgs/trust-bar`) breaks on its DEFAULT `autoScroll:false` configuration unless a derived offset is applied. Neither is visible to `php -l`, `phpcs`, or any static gate — only a live DOM check catches them.
  - *Done when:* the rendered element carries no `style` attribute, AND a live-DOM check confirms each per-item value lands on the intended item (not its neighbour).

### Design Token Specification
- **FR-32-5** — Per-client component tokens live in `sites/<client>/theme-snapshot.json` under `settings.custom.{component}Presets.{variant}.{role}` (values = theme-token references `var(--wp--preset--color--X)`, raw CSS lengths, or `transparent`). WordPress auto-emits these as `--wp--custom--{component}-presets--{variant}--{role}` at `:root` when the snapshot's `settings` are pushed to `wp_global_styles`. *Done when:* the vars resolve at `:root` on the live site.
- **FR-32-6** — A block's `style.css` MUST provide a framework-default fallback (a `var(--wp--preset--color--X)` theme token, never a client hex) for every consumed token, so a freshly-inserted block on a client with no `{component}Presets` still looks correct. *Done when:* a block renders sensibly with the `{component}Presets` key absent from the snapshot.

### Pipeline Contract
- **FR-32-7** — The pipeline EXTRACTS a draft's per-variant styling (base + hover, every declared property) into `settings.custom.{component}Presets` accurately — no hand-authoring, no asking Bean. Reference extractor: `plugins/sgs-blocks/scripts/extract-button-presets.py`. *Done when:* the extractor reproduces the draft's `.sgs-{block}--{variant}` + `:hover` declarations into the snapshot for the reference block.
- **FR-32-8** — The converter EMITS the semantic variant class (`.sgs-{block}--{variant}`) for a recognised preset and emits NO inline colour/geometry style. A draft element with no variant signal stays its natural element (a naked link stays a naked link — NOT forced to a default preset). *Done when:* a cloned preset button carries only `sgs-button sgs-button--{variant}` (+ WP block class); a naked draft link does not become a preset button.

### Naming Convention
- **FR-32-9** — The token namespace is `{component}Presets` (camelCase) in `settings.custom`, where `{component}` matches the block's kebab base (`button` → `buttonPresets`, `card` → `cardPresets`, `hero` → `heroPresets`). Variant slugs are semantic (`primary`/`secondary`/`outline`/…). Role keys are a fixed vocabulary: `background`, `text`, `border`, `hover-background`, `hover-text`, `hover-border` (+ geometry: `border-width`, `border-radius`, `padding`, `font-size`, `font-weight`, `min-height`; + motion: `hover-transform`). *Done when:* every component's tokens follow this scheme (lint/grep check per component).

### CSS Output Consolidation
- **FR-32-11** — A block's sanctioned scoped `<style>` (§6.1(b)) MUST NOT be echoed per-instance into the page body on the frontend. Instead every block **registers** its finished scoped CSS string into the shared SGS collector (`sgs_collect_css($uid, $css)`); the frontend flushes the whole buffer ONCE. The **default frontend output is a single cached external stylesheet** (`/uploads/sgs-css/<content-hash>.css`, generate-then-serve, enqueued in the `<head>`), with a **single consolidated inline footer `<style id="sgs-blocks-collected">`** as the always-correct fallback (cold/changed load, or when uploads are not writable). Buffer keying is by `$uid` (deduped); source order is preserved so the `sgsCustomCss` residual still lands last per uid (Spec 31 FR-31-5.2). The **editor context keeps inline per-block emission** — ServerSideRender/the block-renderer REST route has no `wp_footer`, so consolidation is frontend-only. A `sgs_css_output_mode` filter selects `file` (default) or `inline`; `save_post` invalidates the pointer; the content-hash filename self-busts. Full mechanism: §6.2. *Done when:* a live cloned page renders **0 body `<style>` tags** and one head `<link>` to the hashed file (default mode), with zero visual regression at 375/768/1440 and the editor canvas still styled.

## 5. Non-functional requirements

- **Performance:** static preset CSS lives in the block's enqueued `style.css` (shared, cached) — not per-instance `<style>`. Per-instance override vars add only a tiny scoped `.{uid}.{block}{ --var:value }` rule (registered into the shared collector, NOT inline — FR-32-4) when actually overridden. **Per-instance scoped CSS (responsive tiers, `:hover`, box/typography rules, AND per-instance override `--var` values) is CONSOLIDATED, not scattered** — every block registers into the shared collector (FR-32-11 / §6.2) and the frontend emits ONE cached external stylesheet (default) or one inline footer `<style>` (fallback), never ~100 per-block `<style>` tags in the body. This removes the per-block body `<style>` bloat (~100 tags / ~33KB on a representative page) and makes the per-instance CSS browser-cacheable.
- **Editor parity:** because preset CSS is in `style.css` (loaded in the editor via `editorStyle`/`style`), the editor and frontend match with no render.php-emitted stylesheet (which the editor would not show). Override vars set on the element apply in both.
- **Editor-parity gotcha — viewport-relative sizing leaks into the editor canvas too (e.g. `sgs/nav-drawer`).** That parity is a feature for colour and spacing tokens but a hazard for any rule sized to the VIEWPORT (`100vw`, `100dvh`, `100vh`) rather than to the component. `useBlockProps` puts the same block-name class on whatever DOM `edit.js` renders, so a `style.css` rule written for the real frontend element (e.g. a `<dialog>`) also lands on an unrelated editor-preview element sharing that class, filling the canvas fold. **When a block's frontend markup and its editor preview are structurally different elements** — a hand-built preview shell rather than the same node — **any viewport-relative `style.css` rule MUST be neutralised in `editor.css` for the preview element specifically.** A `min-height` or `max-width` alone does not win against an explicit `height`/`width`, and two rules that TIE on specificity are decided by file order, where a rule that loses is indistinguishable from one that was never written.
- **Security.**
  This contract's whole mechanism is *assembling a `<style>` blob from block attribute values*, so
  the sanitisation of those values is Spec 32's concern, not Spec 31's (which governs extraction, not
  render-time output). Two binding rules:
  1. **Free-text KEYWORD attrs** that are concatenated into a CSS declaration (`borderStyle`,
     `textTransform`, and any future enum-ish string attr) MUST be filtered to the CSS keyword
     alphabet before emission: `preg_replace( '/[^a-zA-Z-]/', '', $value )`. An unfiltered value
     closes the declaration and injects arbitrary CSS.
  2. **The assembled `<style>` blob** MUST pass `wp_strip_all_tags()` before echoing, so no attribute
     value can close the `<style>` element and open a `<script>`.
  *Done when:* every block emitting a scoped rule from a free-text attr applies (1), and every
  `<style>` emit site applies (2).

  **Enforcement:**

  - **Rule 1 (keyword allowlisting).** `check-editor-render-parity.js` CHECK B (blocking) validates
    literal PHP-variable-interpolated keyword values against
    `plugins/sgs-blocks/scripts/css-keyword-enums.json` (object-fit, display, text-align,
    text-transform, font-style, overflow, flex-direction, justify-content, align-items).
    `borderStyle` is deliberately NOT in that table — it is covered instead by an identical
    `in_array( $raw, $allowed, true )` local allowlist repeated at every emission site (the
    `border_style_raw` sites in `src/blocks/*/render.php`, plus
    `plugins/sgs-blocks/includes/media/atoms/box-shape.php::sgs_media_atom_box_shape_validate_border_style` and
    `src/blocks/form/render.php`'s own copy). Reproduce the site list with
    `git grep -n border_style_raw -- plugins/sgs-blocks/src plugins/sgs-blocks/includes`.
  - **Rule 2 (blob-level `wp_strip_all_tags()`).** `plugins/sgs-blocks/scripts/check-style-blob-sanitisation.py`
    is a blocking gate (registered in `scripts/gates.json`, fast tier only — removed from `package.json`'s
    `postbuild` because it ran twice). Survey/fix/check/self-test triad (THE-MIGRATION-METHOD shape). It parses every
    render.php with a literal `<style` tag across four emission shapes —
    `printf`/`sprintf` with one-or-more `%s` placeholders (resolved by PLACEHOLDER POSITION, not
    argument order, because `sprintf( '<style id="%s">%s</style>', esc_attr($uid),
    wp_strip_all_tags($css) )` has the content arg SECOND), a `.`-concatenation chain of any
    shape (plain, ternary-wrapped, or a multi-part interpolated-id opening tag), and both heredoc
    variants (plain, and an opening tag that itself interpolates PHP for an `id="…"` attribute).
    The self-test carries positive + negative fixtures for every shape plus regression controls
    pinning known false positives (see the script's own header).
    `npm run check:style-blob-sanitisation` / `survey:style-blob-sanitisation` /
    `selftest:style-blob-sanitisation` run it standalone.
  - **Related coverage:**
    `class-sgs-css-registry.php` wraps the whole collected frontend buffer in
    `wp_strip_all_tags()` before the consolidated footer `<style>` — but that filter only fires on
    a real frontend `render_block` pass, not the editor's ServerSideRender REST call, which is why
    each render.php's OWN blob-level wrap is load-bearing and the gate checks it directly.
    `helpers-scoped-instance-vars.php`'s `sgs_append_scoped_var_style()` calls
    `wp_strip_all_tags()` internally — a render.php that only emits via that helper needs no
    local wrap. The generic `render_custom_css()` filter (`includes/custom-css.php`, the
    `sgsCustomCss` free-text residual) wraps correctly too.
- **Accessibility:** every hover rule MUST have a keyboard-reachable counterpart. Which pseudo-class is not a free choice — it follows the element: the hover target is itself focusable (link/button/tabindex) → `:focus-visible`; the hover target is a CONTAINER whose focusable content sits inside it (card, list item, section) → `:focus-within`. A `:focus-visible` rule on a non-focusable container can never match — it reads as compliant in source while delivering nothing to a keyboard user. Contrast remains a snapshot-data concern, kept correctable because
  overrides are low-specificity var values, not an ID/`!important` ceiling.

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
per-instance override → scoped rule .{uid}.sgs-button{ --sgs-button-background:#xyz }  (FR-32-4, scoped value — NOT inline style=)
```

Key decisions:
- **BEM class, not `.is-style-*`.** Semantic, matches the draft, and needs no `register_block_style` registration (the pipeline sets the modifier class directly; a manual author sets it via a simple inspector control).
- **Tokens via `settings.custom`, not a bespoke generator.** WP already emits the vars from the snapshot — zero generation code (Spec 11 Decision 24).
- **Framework default = a theme token (`--wp--preset--color--*`), never a client hex** — so a fresh block is neutral-correct and re-skins with the palette.

## 6.1 Geometry token families / box-object contract

> **Inline-zero rollout is complete** — `node plugins/sgs-blocks/scripts/audit-inline-styling.js --check`
> → 0 inline styling violations across every block plus the shared wrapper, exit 0. No `sgs/*` block
> emits an inline `style` property declaration. The claim holds because the no-inline gates run in
> the `fast` tier and the injector contract in §6.2(a) keeps them honest.
>
> Live block count: `ls plugins/sgs-blocks/src/blocks/*/block.json | wc -l`.
> `sgs/mega-panel`'s root border (colour + gradient + radius) is on `SgsBorderControl`
> (width + colour + style); radius stays its own scalar attribute rather than folded into the
> control's corner-object radius param, since that would be a stored-shape migration against live
> content, not a control-shape swap.

**Rollout status:** the mechanism is LANDED on `sgs/container`, `sgs/button`, `sgs/heading`, `sgs/text`, `sgs/quote`, `sgs/media` and `sgs/hero` (its per-area families `contentPadding`/`mediaPadding`/`splitMediaPadding`/`splitMediaBorderWidth`/`splitMediaBorderRadius` + `contentBandPadding` are objects). The shared `SGS_Container_Wrapper` is fully no-inline (base spacing, max-width/contentWidth/band, grid/flex all scoped). **Pattern selector:** content-KIND composites that use only box+width go BLOCK-PRIVATE (like quote); section/layout composites keep the wrapper (like hero) — see Spec 31 FR-31-21.1. The framework-wide inline-zero drive is complete: `audit-inline-styling.js --check` → 0 violations, and a live DOM sweep of `/s1-probe-spec32/` found **0 inline `style` attributes across 150 `sgs-` elements** (page-wide `style="--"`=0, empty `style=""`=0). The shared `SGS_Container_Wrapper` emits the `style` key only when non-empty (no empty `style=""` on any content-KIND composite or header/footer) and routes `$styles` `--var` VALUES to a scoped `.$uid{…}` rule; the residual blocks (info-box/icon/testimonial/button/cart/option-picker/audio/collapsible-text/responsive-logo/mega-menu) are block-private. Every `[style*="--sgs-*"]` presence-selector is written as `var(--x,<resting>)` inert fallbacks. Three structural anti-regression prebuild gates run in the `fast` tier — `audit-inline-styling`, `no-inline-check-no-inline` and `no-inline-check-stranded-guards`; confirm with `python plugins/sgs-blocks/scripts/run-gates.py --list`.

**Box-family contract.** `sgs/product-card`'s CTA padding is a single `ctaPadding` object attr in `supports.sgs.boxFamilies` (mirrors `sgs/button`); an empty-object default falls through to the `.sgs-button` base 14px 24px. Multi-side box props are expressed as `{top,right,bottom,left}` objects, never ad-hoc axis pairs. The cloning-pipeline declarative seeding (Spec 31 §4) depends on this consistency to route padding without collision.

**Box-flat scalar audit.** The `plugins/sgs-blocks/scripts/consistency/check-box-flat.py` gate (informational) finds box-object-*capable* attrs still expressed as single SCALARS (never tagged `box_family`). DELIBERATE-KEEP scalars are intentionally uniform (pill/tag/badge/icon-circle radius, `sgs/label` radius, brand-strip tile) — do NOT convert them. `sgs/card-grid` `cardBorderWidth` is a 4-side object via the shared `ResponsiveBoxControl`. **`ResponsiveBoxControl` locks `splitOnAxis={false}`** — linked single value by default, unlink → 4 sides.

**Grid-item defaults box controls.** The shared `GridItemDefaultsPanel` (`plugins/sgs-blocks/src/blocks/container/components/GridItemDefaultsPanel.js`) edits `gridItemPadding` / `gridItemBorderRadius` through `BoxControl`; `sgs/product-card` `ctaBorderWidth` / `ctaBorderRadius` are box objects whose defaults are seeded to the uniform value so they stay visually identical (`object-typed-attr-coerces-flat-to-default` trap). ⇢ **CROSS-SPEC: inspector-control construction is Spec 35's** (editor-facing UI). **Spec 32 keeps the box-object SHAPE contract; Spec 35 owns building the control that edits it.**

**Colour-alpha.** SGS colour controls get alpha from the shared `DesignTokenPicker` (`enableAlpha` defaults to `true`).

Section 6 covers colour/typography preset tokens (`{component}Presets`). This section covers the SIBLING geometry mechanism — spacing/border shape. It resolves two constraints: (1) the base layer of every block declaring a WP styling `support` inlines by default via `get_block_wrapper_attributes()` — the fix is to **keep the support** and change WHERE it serialises, never to drop it; (2) 4-side and 4-corner families are stored as named objects rather than flat per-side/per-corner attrs, which is the standard WP editor shape and mergeable/re-skinnable cleanly.

### (a) The named-object shape + WP `BoxControl`
A merged box family is ONE attribute of `"type": "object"` holding named keys — WP's own `BoxControlValue` shape (verified in Gutenberg docs, no bespoke positional-array/index-map needed):
- **4-side families** → `{ "top": <len>, "right": <len>, "bottom": <len>, "left": <len> }`, consumed via WP's native **`BoxControl`** editor component (linked/unlinked, per-side units, native spacing-preset support).
- **4-corner families** (border-radius) → `{ "topLeft": <len>, "topRight": <len>, "bottomLeft": <len>, "bottomRight": <len> }`, consumed via `__experimentalBorderRadiusControl` / BoxControl corner mode.
- `<len>` = a CSS length string (`"20px"`, `"1.5rem"`, `"0"`) or an absent/empty key = that side unset (falls to CSS default / inherits). The unit is carried inline in each value, so no separate `{attr}Unit` companion attr is needed.
- `default`: `{}` (empty object).

### (a1) The SHARED shorthand builders — one per keying, never a per-block closure

A box object becomes a CSS shorthand string through **one shared helper per keying**, in
`includes/helpers-box.php`. There is no third option: a `render.php` that hand-rolls its own
closure is duplication to migrate, not a local choice.

| Keying | Helper | Shorthand order |
|---|---|---|
| 4-side (`top/right/bottom/left`) | `sgs_box_object_shorthand( array $box ): ?string` | top right bottom left |
| **4-corner** (`topLeft/topRight/bottomRight/bottomLeft`) | **`sgs_corner_object_shorthand( $box ): ?string`** | TL TR BR BL |

Both return `null` when every key is empty, so the caller skips the declaration entirely rather
than emitting a no-op rule. **They are NOT interchangeable** — CSS `border-radius` shorthand order
is TL TR BR BL, which is a different sequence from the box-model's TRBL, so passing a corner object
to the 4-side helper silently produces wrong geometry.

⛔ **`sgs_corner_object_shorthand()` takes a MIXED value and guards with `is_array()` internally —
do not "tidy" it to a typed `array` parameter.** Callers legitimately pass a raw null
(`$attributes['borderRadiusTablet'] ?? null`). A typed parameter throws `TypeError` and fatals the
page. **The riskiest existing caller sets the signature, not the tidiest one.**

Enforcement: `scripts/migrate-render-closures.py` owns both families (`--survey` / `--fix` /
`--check` / `--self-test`). Its `--check` is the gate; its self-test carries a negative control per
family. It is a script and not `sed` because several files use ALIGNED assignment
(`$sgs_css_keyword  = static function`), which a literal-space find/replace silently skips.

### (a2) Length sanitisation

Two sanitisers exist and they are NOT equivalent:

| | `sgs_css_length_sanitise()` (crude) | `sgs_css_length_value()` (hardened) |
|---|---|---|
| `-10px` | `10px` — **sign silently lost** | `-10px` |
| `calc(100% - 20px)` | `calc10020px` — **corrupted** | preserved |
| `var:preset\|spacing\|40` | `varpresetspacing40` — **corrupted** | passed through unchanged ⚠ |
| bare `16` | `16` — invalid CSS, renders nothing | `var(--wp--preset--spacing--16)` |

⚠ **The hardened function does NOT resolve `var:preset|spacing|40`** (measured, not assumed) — it
passes the raw string through UNCHANGED, which is still invalid CSS. The gain over the crude function is that the value is not
corrupted into `varpresetspacing40`, not that it renders.

The crude one is `preg_replace( '/[^A-Za-z0-9.%]/', '', … )` — it strips hyphens, spaces and
parens unconditionally. `var:preset|spacing|40` is exactly what WP's `BoxControl` emits for a preset
value, so that corruption is a live path, not a theoretical one.

**Every LENGTH-valued call site uses `sgs_css_length_value()`.** `sgs_container_gap_value()`
(`plugins/sgs-blocks/includes/helpers-container.php::sgs_container_gap_value`) delegates to the
hardened function, which is why bare-integer `gap` defaults (`"16"`, `"40"` on `sgs/container` and
`sgs/gallery`) resolve to preset vars correctly. Two call sites stay on the crude function, named
in `scripts/migrate-length-sanitiser.py`'s `EXCLUDE` list: `testimonial`'s `quoteLineHeight`
(unitless-legal, see the box below) and `google-reviews`' `gr_pct` (a bare percentage the caller
appends its own `%` onto — preset-wrapping a bare number there would emit invalid CSS, the same
failure mode the hardened function exists to remove).

⛔ **The hardened function must NEVER be used for a UNITLESS-LEGAL property** — `line-height`,
`opacity`, `z-index`, `flex-grow/shrink`, `font-weight`, `order`, `aspect-ratio`. It maps a bare
integer to a **spacing** preset, so `line-height: 2` would become
`line-height: var(--wp--preset--spacing--2)` — a length token on a unitless property. Exactly **one** call site is unitless-legal (`testimonial/render.php` `quoteLineHeight`)
and stays on the crude function; every other call site is length-valued.

### (b) Base serialises SCOPED, not dropped and not inline
**Keep the support + `__experimentalSkipSerialization` + serialise scoped — never drop the support.** WordPress's `get_block_wrapper_attributes()` auto-inlines any declared `supports.spacing`/`supports.__experimentalBorder` value — that inlining IS the defect class, not the support's existence. The fix: flip serialisation from auto-inline to scoped, per property, via `__experimentalSkipSerialization`, then write the block's resolved `style.spacing.padding` / `style.border.radius` object to its own **CLASS-LEVEL** scoped selector — `.{$uid}.{block-root-class}` (specificity 0,2,0), **NOT** `#{$uid}` — using the stable core API `wp_style_engine_get_styles($style, ['selector' => $scoped_selector])['css']`, **registered into the shared SGS collector (FR-32-11 / §6.2) on the frontend** (echoed inline only in the editor context). This is exactly how WP core outputs `layout` support (a `.wp-container-{id}` rule, not inline) — not a bespoke SGS mechanism. **Class-level, never ID:** WordPress core (6.6 `:root :where()` = 0-1-0), Kadence, Spectra and GenerateBlocks all keep per-instance styling at low/equal specificity and resolve overrides by SOURCE ORDER, never by ID/`!important` escalation. Emitting per-instance styling at `#uid` would make it un-overridable by the equal-specificity `sgsCustomCss` residual (Spec 31 FR-31-5.2) — a render-precedence defect. Every block therefore emits per-instance styling at class-level; any `#uid` emitter is normalised. `skipSerialization` suppresses only WP's *auto-inline output*; it does NOT stop the `style` attribute being populated, so render.php still reads it to emit the scoped rule. Container base spacing serialises scoped with zero inline declarations on the rendered element.

### (c) Family roster — merge vs keep-scalar

Block membership per family is DB-authoritative:
`python ~/.claude/skills/sgs-wp-engine/scripts/sgs-db.py sql "SELECT box_family, COUNT(DISTINCT block_slug) FROM block_attributes WHERE box_family IS NOT NULL AND box_family!='' GROUP BY box_family"`.

**MERGE to a named object (2 destination classes):**

| Class | Family | Blocks | Destination |
|---|---|---|---|
| WP-native root (4-side) | `padding{side}` | every block declaring root padding | base → `style.spacing.padding` object; tiers → SGS `paddingTablet`/`paddingMobile` object |
| WP-native root (4-side) | `margin{side}` | every block declaring root margin | base → `style.spacing.margin` object; tiers → `marginTablet`/`marginMobile` object |
| SGS custom (4-side) | `borderWidth{side}` | every block with a border-width control | SGS object `borderWidth:{...}` — colour/style stay single scalar attrs (no per-side colour/style family exists) |
| SGS custom (4-side) | `contentBandPadding{side}` | `container`, `cta-section`, `hero`, `physics-canvas`, `site-footer`, `site-header`, `trust-bar` | SGS object + tiers + BoxControl (per-band, not root) |
| SGS custom (4-side) | per-area families: `contentPadding`, `mediaPadding`, `splitMediaPadding`, `splitMediaBorderWidth` | `hero` | SGS object + tiers + BoxControl |
| WP-native root (4-corner) | `borderRadius{TL,TR,BL,BR}` | every block declaring root radius | base → `style.border.radius` object `{topLeft,…}`; tiers → `borderRadiusTablet`/`borderRadiusMobile` object |
| SGS custom (4-corner) | `splitMediaBorderRadius{TL,TR,BL,BR}` | `hero` | SGS custom corner object + corner control |

**KEEP scalar (not box properties, or single-side):**

| Family | Blocks | Why not an object |
|---|---|---|
| `attributionMarginTop` | quote | Single side only — a 4-side BoxControl would show 3 dead controls |
| `labelMarginBottom` | option-picker | Single side |
| `quoteMarginBottom` | testimonial | Single side |
| `shapeDivider{Top,Bottom}` + `…Colour/Flip/Height/Invert` | container, cta-section, hero, site-footer, site-header, trust-bar | Not a box property — two independent decorative SVG slots each with its own sub-settings; `{top,right,bottom,left}` is semantically wrong (no left/right divider). Keep the named-slot structure. |

> **The `box_family` categorisation guard is Spec 31's, not this spec's — cross-referenced, not
> duplicated.** The DB column, its declarative seeding via `block.json`
> `supports.sgs.boxFamilies`, and the plant-tested AST gate (`check-box-family-guard.py`) are
> specified in **Spec 31 §3.A step 3b, §4 and FR-31-22.1/.2**.

Note: `sgs/button`/`sgs/heading`/`sgs/quote`/`sgs/text`/`sgs/container` route border colour/width/style via **CUSTOM attrs** (`supports.__experimentalBorder` is NULL on button; only `sgs/container`'s radius still rides `__experimentalBorder`, skip-serialised). This is the same private-attr path on every block using `SgsBorderControl` (`git grep -l '<SgsBorderControl' -- 'plugins/sgs-blocks/src/blocks/*/edit.js' | wc -l`). The categorisation guard is keyed on the DB `box_family` value, never the routing path (Spec 31 §4/§3.A step 3b).

### (d) FR-32-10 — pipeline extraction + block consumption
**FR-32-10** — The pipeline extracts a draft's per-side/per-corner box CSS into the named-object shape: a draft `padding: 12px 18px 12px 18px` (or the equivalent 4 discrete declarations) resolves to `{ "top": "12px", "right": "18px", "bottom": "12px", "left": "18px" }` on the owning attr (Spec 31 §3.A step 3b's cross-declaration accumulator), never 4 flat attrs. The block consumes the object via the shared responsive **BoxControl** wrapper component in `edit.js` (device-tier switcher selects base/tablet/mobile; `onChange` writes the object) and reads it in `render.php`/the shared helper to emit the scoped rule per (b). *Done when:* an asymmetric draft box (4 distinct side values) round-trips to 4 distinct correct computed values live, and the editor BoxControl preview matches the frontend.

### (e) Per-instance override channel
Consistent with FR-32-4: a per-instance override on a box-object property is a CSS custom-property **VALUE**, never an inline property declaration. The **only** non-attr styling output permitted anywhere in this contract is a genuinely non-device-tier breakpoint rule (Spec 31 FR-31-5.2's `ResidualBand`), which is the sole legitimate use of the block's `sgsCustomCss` (Additional-CSS) field — every other override flows through the object attr + scoped `<style>`, never a bespoke inline escape hatch.

## 6.2 CSS output consolidation (FR-32-11)

**Status: BUILT.** Encodes the collector + file-default output. Implementation detail: `.claude/plans/archive/2026-07-12-style-tag-consolidation-design.md`.

**Problem.** §6.1(b)'s scoped `<style>` is emitted per block instance into the page body — on a representative live page: ~100 body `<style>` tags, ~33KB. Compliant (§6.1(b) sanctions the scoped `<style>`) but bloated + non-cacheable. The industry-settled fix (WP core / Kadence / Spectra / GenerateBlocks): register each block's CSS into a central collector; flush once.

### (a) The collector — `includes/class-sgs-css-registry.php` (BUILT)
Implemented as a **single `render_block` chokepoint**, NOT ~60 per-block emit-site edits: a late (`priority 99`) `render_block` filter lifts every `<style>` tag out of each `sgs/*` block's rendered HTML into a per-request buffer (`sgs_collect_css`, deduped by content hash, insertion order preserved so the `sgsCustomCss` residual lands last). This captures all 6 emit shapes — including the container wrapper's prepended tag and `custom-css.php`'s appended residual — **without touching either file**, and is inherently universal (R-31-9).
- **Editor split (CRITICAL):** the lift filter + the head buffer are gated to a genuine front-end render via `sgs_is_frontend_render()` = `! is_admin() && ! wp_is_serving_rest_request()` (WP 6.5+; the naive `! is_admin()` is WRONG — false during REST — which would strip the ServerSideRender editor previews' `<style>` into a buffer that never emits → unstyled canvas). The block-renderer REST route (`context=edit`) keeps the block's `<style>` inline; the frontend consolidates.

> **Injector contract.** The p99 lift above assumes every `render_block` filter that writes into a
> block's markup appends AFTER the leading scoped `<style>` tag. An injector that assumes
> **first-tag-is-root** and inserts its class/attribute/overlay output INSIDE that leading `<style>`
> string has that output silently **stripped along with the style tag** by the p99 lift, erasing both
> the injected markup and the evidence it ever ran. The `render_block` injectors
> (`hover-effects.php`, `animation-attributes.php`, `parallax.php`, `image-controls.php`) therefore
> skip-offset past the leading `style`/`script` tags before inserting.
>
> Injectors' per-instance `--var` writes MUST NOT ride inline `style="--var:…"`: an inline write into
> the stripped `<style>` string vanishes, leaving var-driven features (hover-effects, parallax
> strength, image-controls object-fit) functionally dead while the live no-inline gate has nothing to
> catch. They go through the shared helper `includes/helpers-scoped-instance-vars.php` (reuse-or-mint
> a scope class + append a scoped `.{class}{--var:…}` rule to the collector, same pattern as
> §6.1(e)); `parallax.js` reads `getComputedStyle` (cascade-aware), not `el.style`.
>
> All inline instance-var writers across plugin PHP route through scoped rules, including
> `class-sgs-container-wrapper.php`, `class-post-grid-rest.php` and `shape-dividers.php`. **The
> scope of the search is what matters:** a claim of "no remaining inline writer" is only as wide as
> the grep that produced it — search `render_block` injectors and `includes/`, not only `render.php`.
> Known gate-coverage gap (parked: `P-NO-INLINE-GATE-COVERAGE-GAPS`): the live no-inline gate's canary
> URLs never exercise a hover/animation-attributed instance.

### (b) Head placement + output modes (operator-selectable; BUILT)
Delivery is a **single output buffer** (`template_redirect`) that places the consolidated CSS into the `<head>` (right before `</head>`, so it follows the block `style.css` links → per-instance overrides win by source order) on EVERY front-end render. Placing it every render makes the output **self-consistent under full-page caching** — the cached HTML always carries the matching link/style — so there is **NO pointer, NO cold/warm transition, and NO cache-freeze**. Two modes, chosen on **SGS → CSS Output** (`sgs_css_output_mode` option, default `file`; still `apply_filters`-able):
- **`file` (DEFAULT)** — a cached, content-hashed external `<link>` (`/uploads/sgs-css/sgs-<epoch>-<hash>.css`) injected into the head. Cleanest HTML, browser-cacheable (immutable `Cache-Control` via a one-time `.htaccess`), and an optimisation plugin (LiteSpeed/Autoptimize/WP Rocket/Perfmatters — listed with the exact setting on the settings page) can defer/critical-split it. Written atomically (tmp + `rename`); write failure → self-contained inline fallback.
- **`head`** — one inline `<style>` injected into the head (the source draft's own model). Fully self-contained: no external file, no cache dependency, works with zero extra plugins. Recommended when no optimisation plugin is run.
- **Invalidation (file mode) is automatic**: changed CSS → new content hash → new filename → the freshly-rendered HTML links it. A global CSS **epoch** (filename prefix) is bumped on any `save_post` (pages + `wp_template` + `wp_template_part` + `wp_global_styles` + product are all CPTs → covers content/template/global-styles edits) and on plugin deploy (version+mtime signature); each bump purges the LiteSpeed full-page cache (`litespeed_purge_all`, guarded) and GCs orphaned files.

### (c) What does NOT change
CSS **generation** is untouched — every helper (`sgs_typography_css_rule`, `sgs_label_box_css_rule`, `sgs_responsive_css_rule`, `SGS_Container_Wrapper`, …) still builds the same string; the collector only relocates the finished `<style>`. Not a converter/walker/pipeline change → no conformance golden moves (render-side only); no block version bump. Spec 32 §6.1 no-inline compliance is unchanged.

### (d) Output shape (canary)
`head` mode: one `<style id="sgs-blocks-collected">` in the head, 0 body tags. `file` mode: one `<link id="sgs-blocks-collected-css">` in the head (immutable-cached), 0 body tags, stable under LiteSpeed page cache (loads 4–7 consistent), correct cascade (link after block CSS). Both: hero/button/label-capsule/trial-tag computed values correct at 375/768/1440, `sgsCustomCss` residual precedence intact, 0 console errors, editor canvas still styled.

## 6.3 Grid-item defaults cascade — `--sgs-gi-*`

This section records the grid-item defaults mechanism so it need not be re-derived from `container/style.css`.

**FR-32-12** — A grid CONTAINER parent may set `--sgs-gi-padding` / `--sgs-gi-bg` /
`--sgs-gi-radius` / `--sgs-gi-border` / `--sgs-gi-shadow` / `--sgs-gi-color` as custom-property
VALUES on the grid element (`SGS_Container_Wrapper`, routed via its `$styles` / `$inner_grid_decls`
channel; editor UI: `GridItemDefaultsPanel.js`, `src/blocks/container/components/`). The **ONLY**
CSS consumer is one rule in `src/blocks/container/style.css`, zeroed to specificity (0,0,0) via
`:where()` so a real per-instance value on the grid item's own class-selector rule always wins, and
chained over both direct-child depths (`.sgs-container--grid > .sgs-container` and
`.sgs-container--grid > .sgs-container__inner > .sgs-container`) because the `__inner` band wrapper
renders only when the grid container has its own band props set:

```css
:where( .sgs-container--grid > .sgs-container ),
:where( .sgs-container--grid > .sgs-container__inner > .sgs-container ) {
	padding: var( --sgs-gi-padding );
	background: var( --sgs-gi-bg );
	border-radius: var( --sgs-gi-radius );
	border: var( --sgs-gi-border );
	box-shadow: var( --sgs-gi-shadow );
	color: var( --sgs-gi-color );
}
```

This is a **direct-child selector** keyed on the literal class `.sgs-container`. It only paints
a grid cell when that cell is ITSELF an element carrying `.sgs-container` — i.e. the cell is a
container-wrapper-routed block, not any arbitrary InnerBlock. *Done when:* a block's grid-item
defaults panel is only mounted where this selector can ever match one of its own children.

**Eligibility (the qualifying test):** a block qualifies for a grid-item-defaults panel **only when
its own grid cells render as `.sgs-container`-classed elements** — today that is `sgs/container`
alone, nesting its own children. A block whose repeater/grid renders any other markup (a typed
`items[]` array producing e.g. `<div class="sgs-trust-bar__badge">`, or a composite's own
private-scoped card markup) can never satisfy the selector, however the panel is wired, because the
selector's right-hand side never matches.

⛔ **`block_composition.container_kind` (section/layout/content) is IRRELEVANT to this test — do not
use it as a proxy.** `container_kind` classifies a block in the DRAFT-CLONING layer model (Spec 31
§13.6: which of the 3-layer OUTER/CONTENT-WIDTH/PER-GRID-ITEM model a composite's wrapper occupies);
it says nothing about what markup that block's OWN children render into. Do not answer "do this block's grid cells carry `.sgs-container`" — a DOM-shape question — from `container_kind`. The only correct test is: does the child element carry
literal class `.sgs-container`? Read the block's own `render.php`/`save.js` output, never the
`container_kind` column, to answer it.

**No dead mounts:** `sgs/trust-bar` and `sgs/cta-section` do not mount `GridItemDefaultsPanel`, because they render typed-item markup that never carries `.sgs-container` — a panel there would paint ~15 client-facing controls that change nothing on the frontend. Their declared `gridItem*` block.json attrs stay in place (removing them is a stored-content migration). Verify: `git grep -n "GridItemDefaultsPanel" -- 'plugins/sgs-blocks/src/blocks/*/edit.js'` lists only `container`, plus comments in `trust-bar`/`cta-section`.

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

**All five measured live** on the canary (fixture: `/s1-probe-spec32/`, page id 2502).

| FR | Metric | Target | Result — measured, not inferred |
|---|---|---|---|
| FR-32-1 | Any `style` attribute content on a live `sgs-` element — property declarations OR `--var` values OR empty `style=""` | 0 | ✅ **0 across 150 `sgs-` elements**; the probe button's `style` attribute is `null`. (`audit-inline-styling.js --check` → 0 violations across 83 blocks) |
| FR-32-3 | Primary button computed bg/color on `:hover` vs normal | differ | ✅ hover computed values differ from resting; rules are stylesheet rules, not inline |
| FR-32-2/5 | Re-skin: change only snapshot `buttonPresets.primary.text` → live button text colour changes | yes | ✅ `rgb(58,46,38)` → `rgb(255,0,255)` on a token-only change, **no block-code change**; reverted and re-verified back to `rgb(58,46,38)` |
| FR-32-8 | Cloned naked draft link (no button class) becomes a preset button | never | ✅ naked links do not acquire `sgs-button--primary` |
| FR-32-6 | Fresh button with `buttonPresets` absent still renders correct colours | yes | ✅ key removed from the snapshot and pushed: fell back to the theme token `#fffaf5` (`text-inverse`) and rendered correctly — **the fallback path actually RUNNING, not merely verified in code**. Restored |

## 10. Migration / deprecations

- **Styling model.** The button styles only through the BEM variant class + token vars. `inheritStyle` is the variant selector that drives the BEM class; there is no "Apply preset" inline colour painting. **`src/blocks/button/presets.js` is RETAINED** — it is reused by `sgs/product-card`'s CTA "Apply preset" control; the button block itself does not consume it for styling. Do not treat this file as dead — check its live import graph before touching it. Pre-production (no deprecations): existing dev/canary buttons are re-cloned, not migrated.
- This spec is the operative styling contract. Spec 11 is the button's attribute-surface / feature reference.

## 11. Design questions — answers as shipped

| Question | Owner | Answer, as shipped | Evidence |
|---|---|---|---|
| Does product-card's `cta*` set fold into `cardPresets`, or reuse `buttonPresets`? | Claude | **REUSE `buttonPresets`.** No `cardPresets` group exists — `git grep -c cardPresets` across `plugins/` + `sites/` returns **0**. The CTA's colour is governed entirely by the shared `.sgs-button` / `.sgs-button--{preset}` class channel under the composite-mirror rule; per-block divergent CTA rules are a bug under composite-mirror | `plugins/sgs-blocks/src/blocks/product-card/style.css::.product-card .sgs-button` (colour + layout composite-mirror) |
| Block-scoped override var, or a shared cross-block name? | Claude | **BLOCK-SCOPED, as proposed.** Every block uses its own prefixed namespace — `--sgs-btn-*`, `--sgs-op-*`, `--sgs-mb-btn-*`, `--sgs-social-*`, `--sgs-trust-badge-*` | `button/style.css`, `option-picker/style.css`, `multi-button/render.php` |
| Outline hover border — keep draft-faithful `var(--primary)`, or update the draft to `primary-dark`? | Bean | **DRAFT-FAITHFUL `primary` kept.** The outline preset's hover-border falls back to `var(--wp--preset--color--primary)`; the draft was not changed | `plugins/sgs-blocks/src/blocks/button/style.css::.sgs-button--outline` |

## 11b. Enforcement surface — the gates that hold this contract up

A gate nobody knows about is one refactor away from being deleted as dead weight. These gates
enforce Spec 32 (each names Spec 32 in its own docstring):

| Gate | Blocking? | What it enforces | Spec clause |
|---|---|---|---|
| **`scripts/audit-inline-styling.js`** | yes | Static: no `sgs/*` block emits an inline `style` property declaration | FR-32-1 |
| **`scripts/no-inline/check-no-inline.py`** | yes (`--live-default`) | **LIVE** counterpart to the above — hits a real canary URL and fails if any rendered `sgs-` element carries an inline `style`. ⚠ Note the `no-inline/` SUBDIRECTORY; citing it bare is a known trap. ⚠ It **WARNS and PASSES when the canary is unreachable**, so a green run on a disconnected machine proves nothing | FR-32-1 / FR-32-4 |
| **`scripts/check-id-scoped-emits.js`** | yes | Every per-instance scoped rule is emitted at CLASS level (`.{uid}.{block}` = 0,2,0), never at `#{uid}` — without which the `sgsCustomCss` residual cannot override by source order | **§6.1(b)** |
| **`scripts/no-inline/check-stranded-guards.py`** | yes | Catches `:not([style*="…"])` fallback guards STRANDED by the no-inline contract. Under this contract no block emits an inline `style`, so such a guard always matches, becomes unconditional, and blocks inheritance | §6.1(b) consequence |
| **`scripts/check-style-blob-sanitisation.py`** | yes | `wp_strip_all_tags()` around every literal `<style>` emit site | §5 Security |
| `scripts/check-shared-css-state-rules.js` | yes | State-only shared-CSS size literal with no resting-value base rule | Adjacent to FR-32-3 / §6.2 — flagged, not asserted |

Related mappings:
- **CSS output mechanism** — every function in `class-sgs-css-registry.php` (`sgs_collect_css`, `sgs_css_epoch`, `sgs_css_bump_epoch`, `sgs_css_gc`, `sgs_css_write_htaccess`) is described in §6.2(a)/(b)/(d).
- **`supports.sgs` keys** — `boxFamilies` is §6.1's; `elements` is Spec 35's; `containerKind` and `presetSelectors` are Spec 31's; `imageControls` is root `CLAUDE.md`'s.

## 12. Palette Token Semantics (the colour-role contract)

### 12.0 Why this section exists

This section defines what each colour-preset slug in `theme.json` `settings.color.palette` MEANS, so
every block picks its fill/ink by role, not by "whichever slug looked closest". The collision it
prevents: `theme.json` `styles.color.background: var:preset|color|surface` makes `surface` the PAGE
BODY BACKGROUND on every site, so a block that also uses `surface` as its own card/panel fill is
invisible against the page wherever a client palette's `surface` isn't white (for example
Mama's `surface:#fbf3dc`, where `sgs/testimonial`'s card would vanish). Every slug gets one meaning.

> **Scope note:** this section governs colour VALUES — which token a block picks
> and why. For where a colour CONTROL renders in the inspector (one `SgsColourPanel` per block, a
> row omitted rather than disabled when it doesn't apply, and the one purpose-built exception —
> `SgsBorderControl`), see `specs/35-BLOCK-INSPECTOR-UX-STANDARD.md` PART O §1 fields 9e/9f. That is
> the UX-placement contract; this section is the token-semantics contract. Keep the two separate —
> a value question ("which slug?") is not a placement question ("which panel?").

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

### 12.2 Full palette semantics — **21 framework slugs**

> **This is the FRAMEWORK roster, read from `theme/sgs-theme/theme.json`**
> (`python -c "import json;print(len(json.load(open('theme/sgs-theme/theme.json'))['settings']['color']['palette']))"`
> → 21). A client palette may legitimately be LONGER (see §12.5(b)); it may not be shorter.
>
> **Family naming:** `border` is the base of the border family (`border-light` is its modifier).
> Five families are complete: `primary` / `primary-text`, `accent` / `accent-text` / `accent-light`,
> `info` / `info-light`, `success` / `success-light`, `error` / `error-light`. Every colour reference in
> the framework points at a slug that exists — enforced by `check-palette-slug-refs.py`.
>
> **Display NAMES are plain English, SLUGS stay precise** — the client picking a colour in the editor
> sees "Page Background" and "Text on Dark"; the code reads `surface` and `text-inverse`.

#### ⛔ There is no `text-secondary`, and one must not be added

The framework has **two** text-emphasis levels plus an inverse, and that is deliberate:

| SGS slug | Industry-standard equivalent | Role |
|---|---|---|
| `text` | `text-primary` | main content on a light ground |
| `text-muted` | **`text-secondary`** | supporting copy, captions, metadata on a light ground |
| `text-inverse` | `text-on-inverse` | ink on a dark or saturated ground |

**`text-muted` IS the secondary-copy role.** Adding a `text-secondary` slug would be a second name
for a role that is already named — the exact duplicate-meaning problem §12 exists to prevent. A
`text-secondary` value would also read as ink-on-dark by its name, whereas the value it would carry is
a dark ink for light grounds (`text-inverse` is `#F1F5F9` and already owns the ink-on-dark job). The
`sgs/text` "Lead" block style inherits `text`: a lead paragraph is already differentiated by its size
and weight and should not be de-emphasised. **If a genuine third emphasis tier is ever needed, name
it then, against a real case.**

#### The slot table

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
| `border` | `#D4DBE5` | A quiet, low-contrast NEUTRAL divider/border colour — the default border on cards, inputs, dividers. | Must stay a desaturated neutral close to the surface tones; a saturated brand-accent value here is a role violation (§12.5 finding 1). |
| `primary-text` | `#F1F5F9` | The ink paired with a `primary` fill — mirrors `accent-text`. | Display name "Text on Primary". |
| `info` | `#3B82F6` | Informational/neutral-notice state colour. | Pair with `info-light` panels. |
| `info-light` | `#EBF5FF` | Pale tint of `info`, a RAISED panel/badge fill on the info hue. | |
| `success-light` | `#ECFDF5` | Pale tint of `success`, raised panel fill. | Completes the success family. |
| `error-light` | `#FEF2F2` | Pale tint of `error`, raised panel fill. | Completes the error family. |
| `border-light` | `#E5E7EB` | An even lighter neutral border, for subtler internal dividers (e.g. accordion item separators) than `border`. | |
| `footer-bg` | `#0F172A` | A dedicated dark/deep section background for the site footer (and any block explicitly opting into the footer treatment). | Distinct from `primary-dark` — footer-bg is a NEUTRAL deep tone, not necessarily brand-hued (Indus Foods sets it to `#2c3e50`, unrelated to that client's teal/gold brand pair). Text/links on `footer-bg` use `text-inverse` or a client-specific accessible pairing (see `core-blocks.css` gold-on-footer-bg contrast fix, 4.6:1). |

### 12.3 Current usage by bucket

Every `--wp--preset--color--surface` / `--surface-alt` background/colour call site in
`plugins/sgs-blocks/src/blocks/*/style.css` follows the §12.1 rule. Find call sites by grepping the
token (`git grep -n "preset--color--surface" -- 'plugins/sgs-blocks/src/blocks/*/style.css'`), never
by a line number cached in a doc.

| Bucket | Token | Where the framework uses it |
|---|---|---|
| Raised | `surface-alt` | brand-strip tile bg + hover; countdown-timer `--elevated`/`--filled`; accordion `--card` item and hover/open state; button outline hover bg fallback; cta-section gradient; card-grid card bg + hover; buybox `value-ladder` selected row; form hover/preview-box states; google-reviews card, avatar and badge; info-box `--elevated`/`--filled`; modal dialog panel; product-faq hover/open; post-grid card + shimmer; product-card no-image box / media / thumb-strip bg (generic `#f5f7f7` fallback) and `value-ladder` selected row; product-search; social-icons pill; table-of-contents `--card`; tabs; team-member; testimonial classic-card / rating-led / corporate-logo / case-study-media / pull-quote-editorial; trust-bar |
| Inverse ink | `text-inverse` | `color:` on a coloured/dark fill: business-info icon/text on the primary-filled button; cta-section text; card-grid; google-reviews dark-theme review text; hero; product-card badge fg default; process-steps; social-icons; label |
| Substrate | `surface` | The deliberate-blend cases in §12.4 |

`sgs/testimonial-slider` uses `surface` for one background fill (`testimonial-slider/style.css`); classify it under §12.1 before changing it.

### 12.4 The "deliberate blend" pattern — when `surface` on a component background is CORRECT, not a bug

A handful of components use `surface` as their OWN resting-state background even though they are not
literally the page. This is legitimate, not an instance of the bug, when BOTH are true:
1. The component's shape/boundary is defined by a `border`, not by a fill contrast against the page.
2. An interaction state (hover/open/selected) explicitly switches the SAME element to `surface-alt` (or
   vice versa) as the visible signal that something changed.

Examples kept as `surface` under this rule: accordion item header at rest (raises to `surface-alt` on
hover/open), the FAQ item base (`product-faq`, same pattern), the option-picker `--soft` resting pill
(its own comment calls it "a neutral surface/border-token resting pill"), the form input field fill
(bordered field, no elevation intended), the trust-bar text-only badge's hover state (resting = raised
`surface-alt`, hover recedes to the page), and the brand-strip fade masks (which blend the scrolling
strip's edges into whatever the STRIP itself sits on — the strip/track has no background of its own,
so the mask target is correctly the page).

**If a future component wants this pattern, it must satisfy both conditions above — a component that has
no border AND no state-differentiated `surface-alt` counterpart using `surface` as a fill is the ORIGINAL
bug, not this exception.**

### 12.5 Client palette audit (all client `theme-snapshot.json` files)

Checks run across every client snapshot against the §12.2 roster, reading the actual
`sites/*/theme-snapshot.json` values directly.

**(a) Slot value doesn't match its role — `border` set to a saturated brand accent.**
`border` (§12.2) is meant to be a quiet neutral divider. Reproduce:
`python -c "import json,glob;[print(f,{x['slug']:x['color'] for x in json.load(open(f))['settings']['color']['palette']}.get('border')) for f in sorted(glob.glob('sites/*/theme-snapshot.json'))]"`.
**Open** — the values below have not been re-derived:

| Client | `border` value | Verdict |
|---|---|---|
| mamas-munches | `#e8d5c0` (warm beige, tan-tinted — leans toward the brand's cream/orange family rather than a true neutral) | Role violation (mild) |
| indus-foods | `#2EADE2` (a saturated blue, unrelated to Indus's teal/gold brand pair) | Role violation |
| sgs-healthcare | `#4CAF88` | Role violation |
| sgs-mosque | `#C9A035` | Role violation |
| sgs-construction | `#E8700A` | Role violation |
| sgs-professional | `#8B4A6B` | Role violation |
| eye-care-ward-end | `#D4DBE5` (the framework neutral) | Correct |
| helping-doctors | `#d4e8e4` | Correct |

**(b) Missing slots.** No client is missing any framework slug, enforced by
`check-palette-slug-refs.py` (ships a `--self-test` that plants a violation and asserts rejection).
A check of this shape must assert its output is empty — a verdict that never asserts cannot fail.

⚠ **Client palettes legitimately carry MORE than the framework roster — a longer palette is not
drift.** Palette length per client: `python -c "import json,glob;[print(f,len(json.load(open(f))['settings']['color']['palette'])) for f in sorted(glob.glob('sites/*/theme-snapshot.json'))]"`
(`mamas-munches` carries the most, including client extras such as `border-warm`). §12.2 documents
the FRAMEWORK roster; a client adding to it is expected.

**(c) Duplicate slot definitions** — no duplicate `slug` entries within any single client
snapshot's palette array.

### 12.6 Client colour changes (constraint: never overwrite a deliberate brand choice)

Before changing ANY client's colour, check the client's own `sites/<client>/CLAUDE.md` for a
documented deliberate reason. A value merely LISTED in a client's design-tokens table is not a
DOCUMENTED decision; only prose that traces the value to a brand choice (as for `primary`/`accent`
tracing to the logo) is. A colour change to several live/near-live client palettes is a
blast-radius change that needs Bean's explicit go-ahead.

**Open — client `border` values (§12.5(a)).** Recommended fix, awaiting Bean's sign-off: re-derive
each palette's `border` as a low-chroma neutral near that site's `surface`/`surface-alt` tones, the
way `helping-doctors` and `eye-care-ward-end` already have it.

**Open — `surface-alt` distinctness.** Reading the snapshot values: `mamas-munches`
(`surface:#fbf3dc`, `surface-alt:#fff9f0` — RGB delta only (4,6,20), the weakest) and
`sgs-professional` (`surface:#FFFFFF`, `surface-alt:#F8F7F9` — delta (7,8,6)) are the most
weakly-differentiated pairs; `sgs-construction` (delta (10,12,15)) and `indus-foods` (delta
(7,8,11)) are also subtle. The rest are more clearly distinct. `mamas-munches`' `surface-alt` is a
DECLARED token in the source draft HTML (not something the extractor derived), so changing it
overwrites draft content rather than fixing an extraction bug. If the blocks in §12.3 still look
under-differentiated on the live canary, the fix is a value change to
`sites/mamas-munches/theme-snapshot.json` (and, properly, the source draft's `--surface-alt`
declaration), not a code change.

### 12.7 Verification method (rule 4a — computed, content-keyed, not source-diff) + extractor proof

"Does the fix work" for a colour-role change means computed styles of the rendered element, not a
diff of source declarations: read `getComputedStyle` on the elements against the intended slug's
resolved hex. A token swap in a fallback chain reads through to the same computed value in every
browser.

**The extractor guard (Spec 33 FR-33-2, `plugins/sgs-blocks/scripts/theme-extractor/palette.py::_synthesise_surface_alt`)**
prevents a re-extracted snapshot from recreating the `surface`/`surface-alt` collision:
- A draft with NO content/card background signal at all still emits a distinct `surface-alt`:
  - dark surface `#222831` → synthesised `surface-alt` = `#2f353d` (`_source: "derived"`)
  - light surface `#fbf3dc` (Mama's own hex) → synthesised `surface-alt` = `#ece4cf` (`_source: "derived"`)
- The `surface-alt` role keeps low identity-claim confidence plus a nothing-claimed-it-yet synthesis
  fallback, so the regression guard `test_client_colour_keeps_raw_token_slug_not_custom` (in
  `plugins/sgs-blocks/scripts/theme-extractor/tests/test_extractor.py`) holds.
- Command: `python -m pytest tests/test_extractor.py` from `plugins/sgs-blocks/scripts/theme-extractor/`.
