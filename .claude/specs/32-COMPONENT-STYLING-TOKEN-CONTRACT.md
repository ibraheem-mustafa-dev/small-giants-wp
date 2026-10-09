---
doc_type: spec
spec_id: 32
spec_version: "2.0"
title: Styling, Tokens and Theming Contract (framework-wide)
project: small-giants-wp
status: active
authors: Claude + Bean
last_verified: 2026-10-09
references:
  - .claude/specs/11-SGS-BUTTON-ARCHITECTURE.md
  - .claude/specs/01-SGS-THEME.md
  - .claude/specs/47-COMPUTED-ROUTE-DRAFT-TO-TREE.md
  - .claude/rules/framework-principles.md
  - .claude/plans/archive/2026-07-07-button-external-css-rearchitecture.md
  - .claude/plans/archive/2026-07-09-no-inline-styling-design-gate.md
  - .claude/plans/archive/2026-07-09-box-object-interface-contract.md
absorbs: [26, 33]
absorbed_by: null
lock_reason: null
---

# Styling, Tokens and Theming Contract

⛔ **MORE THAN 3 BLOCKS? BUILD THE DETECTOR FIRST — read
`.claude/skills/migration-method/SKILL.md` before the 4th file edit.** A census-driven pass moves the corrections out of the tree and into the detector, where one commit fixes hundreds of sites. Figures + derivation live in ONE place — do not copy them here. What decides the outcome is whether the TARGET SHAPE is settled first (migration-method/SKILL.md Step 3).

> **One-liner:** Every SGS block styles itself with semantic BEM classes that CONSUME per-client design tokens (CSS custom properties auto-generated from the theme snapshot) — never hardcoded client values, never inline property declarations — so the same block library re-skins across any client by changing `theme.json`/the snapshot alone.

> **Sibling spec:** Spec 32 (this doc) owns the styling/token EMISSION contract (no-inline, scoped CSS, box-object attrs). Spec 35 owns the block INSPECTOR-UX standard (editor-facing controls). The two are separate documents; both gate every block build — read them together.


## Document map

| Part | Sections | Owns |
|---|---|---|
| **A. Component styling and token contract** | §0 to §12 | How a block styles itself: BEM classes consuming per-client tokens, no inline styling, scoped CSS, box objects, the CSS collector, grid-item defaults, the palette colour-role contract. FR-32-1 to FR-32-13. |
| **B. Global styles and theming** | §13 | The WordPress layer model (theme.json seed, `wp_global_styles` post), how a push reaches the live layer, the block-editor styling model. FR-26-A3, A4, A5, B1 to B4, B6, D2, D3. |
| **C. The theme-snapshot format** | §14 | `sites/<client>/theme-snapshot.json`: its keys, the `settings.custom.{component}Presets` contract, internal keys, how it is deployed. |
| **D. The extractor process** | §15 | How a draft becomes a snapshot deterministically: measure, classify, dedupe, validate, push. FR-33-1 to FR-33-20. |

Part A keeps its section numbers because code, skills and other specs cite them (`Spec 32 §6.1(b)`, `§6.2`, `§12.5`). Requirement IDs keep their original numbers across the merge: FR-32-n, FR-26-xn (Part B) and FR-33-n (Part D) are unchanged.

# PART A. Component styling and token contract

## 0a. Status

Status is held by the gates in §11b, not by a table. Re-run them rather than quoting a result: `python plugins/sgs-blocks/scripts/run-gates.py --list` shows the tier each gate runs in, and `node plugins/sgs-blocks/scripts/audit-inline-styling.js --check` must exit 0. Every requirement in §4 carries its own "Done when" criterion; §8 records the live measurements taken against the canary fixture.

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
- WordPress Block Style Variations (`register_block_style` + theme.json variations). Rejected: they optimise for MANUAL authoring (editor Styles switcher, client self-service editing) which a pipeline-driven, auto-preset-determined library does not need; they add pipeline-mapping friction + WP-cascade coupling for ~zero gain here. (Research: `.claude/plans/archive/2026-07-07-button-external-css-rearchitecture.md`.)
- Editor Global-Styles self-service preset editing (clients do not author; Bean QCs).

## 3. Hard constraints

| Constraint | Source | Non-negotiable |
|---|---|---|
| No block setting is ever emitted as an inline `style=""` property declaration | Owner rule | Y |
| Hover/focus/active/responsive states live in a stylesheet rule only | CSS (inline cannot express pseudo/`@media`) | Y |
| No client brand value (hex/token slug/px) hardcoded in block PHP/JS/CSS | Owner rule | Y |
| **THE DEFAULT-vs-HARDCODE TEST — the question is NOT "is it a literal?" but "does it override a theme-wide default, or hinder the pipeline?"** A block literal that **duplicates a `theme.json styles.elements` default is a SILENT OVERRIDE that disables the theme** — check theme.json BEFORE adding any typography literal to a block. A component's OWN constant that overrides no theme-wide default and stays per-instance overridable **STAYS**. `null`/`''` default = inherit is the canonical pattern. | **Owner rule** | Y |
| Per-client values flow through `theme.json.settings.custom.*Presets` → WP-generated CSS vars | Spec 11 D24 (proven) | Y |
| Pipeline extracts tokens from the draft; never Claude hand-authoring, never asking Bean for values | Owner rule | Y |

## 4. Functional Requirements

### Component Contract
- **FR-32-1** — Every block MUST render its styleable elements with **semantic BEM classes** (`.sgs-{block}` + `.sgs-{block}--{variant}` + `.sgs-{block}__{element}`). The class is the styling hook; markup carries no colour/geometry values. *Done when:* the emitted HTML carries **no `style` attribute at all** on the block's rendered elements — neither a property declaration (`color:…`) NOR a custom-property value (`--sgs-…:…`) NOR an empty `style=""` (grep the live DOM: 0 `style="` on `sgs/*` elements). *(Counting only property declarations would silently permit inline `--var`.)*
- **FR-32-2** — A block's `style.css` MUST style each variant by **consuming design tokens** with a framework-default fallback: `.sgs-{block}--{variant} { <prop>: var(--wp--custom--{block}-presets--{variant}--{role}, var(--wp--preset--color--{fallback})); }`. *Done when:* changing only the snapshot token re-skins the block with no block-code change (verified live).
- **FR-32-3** — Hover/focus/active/responsive states MUST be authored as stylesheet rules (`.sgs-{block}--{variant}:hover { … }`, `@media { … }`) consuming the `hover-*` / tier tokens. *Done when:* a preset button changes colour on `:hover` on the live page (computed style before/after hover differ).

  ⭐ **CANONICAL EMITTER for hover COLOUR: `sgs_emit_state_colour_css( $selector, $decls_normal, $decls_hover )`** in `plugins/sgs-blocks/includes/helpers-tokens.php`, modelled on `sgs_border_gradient_css()`. It emits `{$selector}:hover,{$selector}:focus-visible{…}` as real declarations on the block's own scoped selector, and returns `''` when nothing is set so an unset instance renders byte-identical CSS to before it existed.

  Blocks routing through the helper: `info-box`, `hero`, `process-steps`, `cta-section`, `post-grid`, `card-grid`, `testimonial`, `testimonial-slider`. A block does not write `--sgs-hover-bg/text/border` custom-property VALUES for a static `style.css` rule to read back through `var()`.

  ⛔ **`sgs/button` is EXEMPT** — its `--sgs-btn-*-hover` vars feed a static `style.css` rule AND three preset classes with `theme.json` fallback chains, which is the mechanism this very requirement describes. Do not "finish the job" and break the preset cascade; the exemption is recorded in the helper's own docblock.

  ⚠ Unset means no hover: no block injects a hardcoded `var(…, <fallback>)` default that overrides the operator's own setting. An injected default that overrides the operator's own setting is a cheat to remove, not a behaviour to preserve.

  ⚠ Descendant-hover is the ONE shape the helper does not cover: it appends `:hover` to the selector it is given, so where hovering a PARENT must recolour children that carry their own explicit resting colour (`sgs/post-grid`), the rule is hand-built to the same contract and pairs `:focus-within` rather than `:focus-visible`, because the focusable element is a descendant.

### Override Strategy
- **FR-32-4** — A per-instance override (editor-set custom value, or a genuine per-block draft exception) MUST be emitted as a **CSS custom property VALUE** scoped to the instance (`--sgs-{block}-{role}: <value>`), consumed by the block's class rule via `var()`. It MUST NOT be an inline property declaration (`color: …`). **The custom property itself MUST NOT be emitted inline either (`style="--sgs-{block}-{role}: <value>"` is FORBIDDEN on the frontend):** the per-instance value MUST be written as a scoped `.{$uid}.{block-root-class}{ --sgs-{block}-{role}: <value>; }` rule in the block's own `<style>`, registered into the shared SGS collector (FR-32-11 / §6.2). *(Rationale: even a bare inline `--var` (a) leaves a `style` attribute on the rendered element, which the framework-wide gate treats as a violation, and (b) silently breaks any CSS rule that gates on an inline-attribute-presence selector `[style*="--var"]` the moment the value moves scoped. It also loses nothing: the scoped custom-property VALUE still cannot beat `:hover` and applies identically. This is consistent with §6.1(b) and §6.1(e).)* The **only** permitted non-attr, non-scoped-`<style>` styling output anywhere in this contract is the documented `sgsCustomCss` residual (§6.1(e), FR-32-13), and even that is a scoped stylesheet rule, never an inline `style=` attribute. *Done when:* an overridden instance shows the custom value in editor AND frontend, its `:hover` still works, AND the rendered element carries NO `style` attribute (grep the live DOM: 0 `style="--` on `sgs/*` elements).

- **FR-32-4a** — **Per-ITEM override values in a repeater block.** FR-32-4's shape — one `.{$uid}.{block-root-class}{ --var: <value>; }` rule — carries exactly ONE value per instance, so it cannot express N different values across N repeater items (per-item icon fill, per-item stagger index, per-item bar percentage). Such values MUST still never ride inline. They are emitted as **one positional scoped rule per item**: `.{$uid} .sgs-{block}__{item}:nth-child(N){ --var: <value>; }`, appended to the same block-owned `<style>` as every other scoped rule. Reference implementation: `sgs/social-icons` per-item brand colour (`plugins/sgs-blocks/src/blocks/social-icons/render.php::$scoped_css`).
  - **The positional-integrity requirement (load-bearing).** `:nth-child(N)` counts **every element sibling**, not only the addressed items. A rule is therefore correct only if, at the point it is written, N equals the item's real position among its parent's children. Two compositions satisfy this: (a) the items are the **sole** element children of their parent — no `<style>` tag, heading, toggle or caption shares it (the block's own `<style>` must be emitted OUTSIDE the items' parent, as `sgs/gallery`, `sgs/pricing-table`, `sgs/google-reviews` and `sgs/social-icons` all do); or (b) a **derived offset** is added to N, computed from the same variables that compose the parent so it cannot drift.
  - *Rationale:* two failure modes exist. A block that emits its scoped `<style>` tags INTO the items' own parent (`sgs/card-grid`) guarantees an offset of ≥1 whenever a staggered feature is active; a block whose badges share their parent with the block title (`sgs/trust-bar`) breaks on its DEFAULT `autoScroll:false` configuration unless a derived offset is applied. Neither is visible to `php -l`, `phpcs`, or any static gate — only a live DOM check catches them.
  - *Done when:* the rendered element carries no `style` attribute, AND a live-DOM check confirms each per-item value lands on the intended item (not its neighbour).

### Design Token Specification
- **FR-32-5** — Per-client component tokens live in `sites/<client>/theme-snapshot.json` under `settings.custom.{component}Presets.{variant}.{role}` (values = theme-token references `var(--wp--preset--color--X)`, raw CSS lengths, or `transparent`). WordPress auto-emits these as `--wp--custom--{component}-presets--{variant}--{role}` at `:root` when the snapshot's `settings` are pushed to `wp_global_styles`. *Done when:* the vars resolve at `:root` on the live site.
- **FR-32-6** — A block's `style.css` MUST provide a framework-default fallback (a `var(--wp--preset--color--X)` theme token, never a client hex) for every consumed token, so a freshly-inserted block on a client with no `{component}Presets` still looks correct. *Done when:* a block renders sensibly with the `{component}Presets` key absent from the snapshot.

### Pipeline Contract
- **FR-32-7** — The pipeline EXTRACTS a draft's per-variant styling (base + hover, every declared property) into `settings.custom.{component}Presets` accurately — no hand-authoring, no asking Bean. The extractor process is Part D (§15); button presets are measured from rendered buttons by `plugins/sgs-blocks/scripts/theme-extractor/presets.py` (FR-33-4). *Done when:* the extractor reproduces the draft's `.sgs-{block}--{variant}` + `:hover` declarations into the snapshot for the reference block.
- **FR-32-8** — A block renders its preset as the semantic variant class (`.sgs-{block}--{variant}`) and emits NO inline colour/geometry style; the cloning route (Spec 47) sets the variant class for a recognised preset. A draft element with no variant signal stays its natural element (a naked link stays a naked link — NOT forced to a default preset). *Done when:* a cloned preset button carries only `sgs-button sgs-button--{variant}` (+ WP block class); a naked draft link does not become a preset button.

### Naming Convention
- **FR-32-9** — The token namespace is `{component}Presets` (camelCase) in `settings.custom`, where `{component}` matches the block's kebab base (`button` → `buttonPresets`, `card` → `cardPresets`, `hero` → `heroPresets`). Variant slugs are semantic (`primary`/`secondary`/`outline`/…). Role keys are a fixed vocabulary: `background`, `text`, `border`, `hover-background`, `hover-text`, `hover-border` (+ geometry: `border-width`, `border-radius`, `padding`, `font-size`, `font-weight`, `min-height`; + motion: `hover-transform`). A component whose painted parts are not a box names its own roles, usable only in its own namespace (`plugins/sgs-blocks/scripts/check-preset-token-naming.py::_COMPONENT_ROLES`): `measuredDiagramPresets` has `line`, `extension`, `value`, `caption`, `line-width` and `extension-width`. *Done when:* every component's tokens follow this scheme (lint/grep check per component).

### CSS Output Consolidation
- **FR-32-11** — A block's sanctioned scoped `<style>` (§6.1(b)) MUST NOT be echoed per-instance into the page body on the frontend. Instead every block **registers** its finished scoped CSS string into the shared SGS collector (`sgs_collect_css($uid, $css)`); the frontend flushes the whole buffer ONCE. The **default frontend output is a single cached external stylesheet** (`/uploads/sgs-css/<content-hash>.css`, generate-then-serve, enqueued in the `<head>`), with a **single consolidated inline footer `<style id="sgs-blocks-collected">`** as the always-correct fallback (cold/changed load, or when uploads are not writable). Buffer keying is by `$uid` (deduped); source order is preserved so the `sgsCustomCss` residual still lands last per uid (FR-32-13). The **editor context keeps inline per-block emission** — ServerSideRender/the block-renderer REST route has no `wp_footer`, so consolidation is frontend-only. A `sgs_css_output_mode` filter selects `file` (default) or `inline`; `save_post` invalidates the pointer; the content-hash filename self-busts. Full mechanism: §6.2. *Done when:* a live cloned page renders **0 body `<style>` tags** and one head `<link>` to the hashed file (default mode), with zero visual regression at 375/768/1440 and the editor canvas still styled.

### Residual CSS channel
- **FR-32-13** — **Arbitrary-breakpoint residual CSS (`sgsCustomCss`).** The device tiers are fixed at 768/1024 (Mobile `<768`, Tablet `768–1023`, Desktop `≥1024`; the unsuffixed attr is the Desktop value; Spec 35 D2 owns the device lock). A single rule at an arbitrary breakpoint (600/640/781) for a design reason is distinct from a device tier and is never coerced into one: it is never snapped to a tier and never dropped. It lives in the block's `sgsCustomCss` (Additional-CSS) field, rendered by `plugins/sgs-blocks/includes/custom-css.php::render_custom_css`. That field is the one sanctioned raw-CSS channel (§6.1(e)); it renders as a scoped rule, never inline, and its control (`plugins/sgs-blocks/src/blocks/extensions/custom-css.js`) must stay editable. Four rules govern its precedence, none of them specificity escalation (no ID, no `!important`):
  1. **Bound.** A residual is confined to the device tier its threshold falls in: a single `min-width:X` becomes `[X, upper edge of the tier containing X]`, a single `max-width:X` becomes `[lower edge of the tier containing X, X]`. So `min-width:600` (in Mobile) is `@media (min-width:600px) and (max-width:767px)`, `min-width:1280` (in Desktop, the top tier) stays open-ended, and `max-width:1200` is `@media (min-width:1024px) and (max-width:1200px)`. A residual never bleeds into an adjacent tier that legitimately differs. Whoever authors the residual (the editor user or the cloning route) applies the bound.
  2. **Fold.** A value that spans a whole tier belongs in that tier's attr, not in the residual. The residual holds only the sub-tier remainder; tier attrs carry a value up through an unset tier.
  3. **Match specificity, write last.** `render_custom_css` doubles its generated scope class (`.sgs-c-XXXX.sgs-c-XXXX`, specificity 0,2,0), equal to the block's own class-level scoped rule, and appends the rule after the block, so it wins by source order. This is the WordPress 6.6 (`:root :where()`) idiom that Kadence, Spectra and GenerateBlocks also use.
  4. **Normalise.** Every block's per-instance styling emits at one class-level specificity (§6.1(b)); no block emits at `#uid` (`plugins/sgs-blocks/scripts/check-id-scoped-emits.js`).

  Known limits: a no-width media condition (`@media print`, `prefers-color-scheme`, `orientation`) is not handled as a residual band; two residuals whose bands overlap resolve by emission order, so bound them ascending. *Done when:* a residual authored at `min-width:600` applies only between 600px and 767px, beats the block's own rule in that band, and leaves the Tablet and Desktop computed styles unchanged (read at 375, 700, 768 and 1440).

## 5. Non-functional requirements

- **Performance:** static preset CSS lives in the block's enqueued `style.css` (shared, cached) — not per-instance `<style>`. Per-instance override vars add only a tiny scoped `.{uid}.{block}{ --var:value }` rule (registered into the shared collector, NOT inline — FR-32-4) when actually overridden. **Per-instance scoped CSS (responsive tiers, `:hover`, box/typography rules, AND per-instance override `--var` values) is CONSOLIDATED, not scattered** — every block registers into the shared collector (FR-32-11 / §6.2) and the frontend emits ONE cached external stylesheet (default) or one inline footer `<style>` (fallback), never ~100 per-block `<style>` tags in the body. This removes the per-block body `<style>` bloat (~100 tags / ~33KB on a representative page) and makes the per-instance CSS browser-cacheable.
- **Editor parity:** because preset CSS is in `style.css` (loaded in the editor via `editorStyle`/`style`), the editor and frontend match with no render.php-emitted stylesheet (which the editor would not show). Override vars set on the element apply in both.
- **Editor-parity gotcha — viewport-relative sizing leaks into the editor canvas too (e.g. `sgs/nav-drawer`).** That parity is a feature for colour and spacing tokens but a hazard for any rule sized to the VIEWPORT (`100vw`, `100dvh`, `100vh`) rather than to the component. `useBlockProps` puts the same block-name class on whatever DOM `edit.js` renders, so a `style.css` rule written for the real frontend element (e.g. a `<dialog>`) also lands on an unrelated editor-preview element sharing that class, filling the canvas fold. **When a block's frontend markup and its editor preview are structurally different elements** — a hand-built preview shell rather than the same node — **any viewport-relative `style.css` rule MUST be neutralised in `editor.css` for the preview element specifically.** A `min-height` or `max-width` alone does not win against an explicit `height`/`width`, and two rules that TIE on specificity are decided by file order, where a rule that loses is indistinguishable from one that was never written.
- **Security.**
  This contract's whole mechanism is *assembling a `<style>` blob from block attribute values*, so
  the sanitisation of those values is this spec's concern. Two binding rules:
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
    `plugins/sgs-blocks/src/blocks/form/render.php`'s own copy). Reproduce the site list with
    `git grep -n border_style_raw -- plugins/sgs-blocks/src plugins/sgs-blocks/includes`.
  - **Rule 2 (blob-level `wp_strip_all_tags()`).** `plugins/sgs-blocks/scripts/check-style-blob-sanitisation.py`
    is a blocking gate (registered in `plugins/sgs-blocks/scripts/gates.json`, fast tier only — removed from `package.json`'s
    `postbuild` because it ran twice). Survey/fix/check/self-test triad (migration-method shape). It parses every
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
    local wrap. The generic `render_custom_css()` filter (`plugins/sgs-blocks/includes/custom-css.php`, the
    `sgsCustomCss` free-text residual) wraps correctly too.
- **Accessibility:** every hover rule MUST have a keyboard-reachable counterpart. Which pseudo-class is not a free choice — it follows the element: the hover target is itself focusable (link/button/tabindex) → `:focus-visible`; the hover target is a CONTAINER whose focusable content sits inside it (card, list item, section) → `:focus-within`. A `:focus-visible` rule on a non-focusable container can never match — it reads as compliant in source while delivering nothing to a keyboard user. Contrast remains a snapshot-data concern, kept correctable because
  overrides are low-specificity var values, not an ID/`!important` ceiling.

## 6. Architecture

Flow (button = reference implementation):

```
draft .sgs-button--primary{…}:hover{…}
        │  (FR-32-7 extractor, Part D)
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
cloning route sets <a class="sgs-button sgs-button--primary">  (FR-32-8, clean HTML)
per-instance override → scoped rule .{uid}.sgs-button{ --sgs-button-background:#xyz }  (FR-32-4, scoped value — NOT inline style=)
```

Key decisions:
- **BEM class, not `.is-style-*`.** Semantic, matches the draft, and needs no `register_block_style` registration (the pipeline sets the modifier class directly; a manual author sets it via a simple inspector control).
- **Tokens via `settings.custom`, not a bespoke generator.** WP already emits the vars from the snapshot — zero generation code (Spec 11 Decision 24).
- **Framework default = a theme token (`--wp--preset--color--*`), never a client hex** — so a fresh block is neutral-correct and re-skins with the palette.

## 6.1 Geometry token families / box-object contract

> `sgs/mega-panel`'s root border (colour + gradient + radius) is on `SgsBorderControl`
> (width + colour + style); radius stays its own scalar attribute rather than folded into the
> control's corner-object radius param, since that would be a stored-shape migration against live
> content, not a control-shape swap.

**No-inline rules that stay binding.** The shared `SGS_Container_Wrapper` emits the `style` key only when non-empty and routes `$styles` `--var` VALUES to a scoped `.$uid{…}` rule. Every `[style*="--sgs-*"]` presence-selector is written as `var(--x,<resting>)` inert fallbacks. Three structural anti-regression gates run in the `fast` tier: `audit-inline-styling`, `no-inline-check-no-inline` and `no-inline-check-stranded-guards` (§11b). **Pattern selector:** a content-KIND composite that uses only box+width goes block-private (like `sgs/quote`); a section/layout composite keeps the wrapper (like `sgs/hero`). The KIND definitions are Spec 02's Composite wrapper rule.

**Box-family contract.** `sgs/product-card`'s CTA padding is a single `ctaPadding` object attr in `supports.sgs.boxFamilies` (mirrors `sgs/button`); an empty-object default falls through to the `.sgs-button` base 14px 24px. Multi-side box props are expressed as `{top,right,bottom,left}` objects, never ad-hoc axis pairs. The DB `box_family` column is seeded from these declarations (see the `box_family` note under (c)); that consistency is what lets the cloning route write padding without collision.

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
`plugins/sgs-blocks/includes/helpers-box.php`. There is no third option: a `render.php` that hand-rolls its own
closure is duplication to migrate, not a local choice.

| Keying | Helper | Shorthand order |
|---|---|---|
| 4-side (`top/right/bottom/left`) | `sgs_box_object_shorthand( array $box ): ?string` | top right bottom left |
| **4-corner** (`topLeft/topRight/bottomRight/bottomLeft`) | **`sgs_corner_object_shorthand( $box ): ?string`** | TL TR BR BL |

**For a device tier, print longhands, not a shorthand** (the side shorthand above is now for border width only; the corner shorthand has no caller, and a custom property holding corners prints one property per corner through `sgs_corner_object_property_list`). A shorthand prints `0` for every unset side
or corner, wiping the stylesheet's value and the wider tier's (CR6). Tier rules use
`sgs_box_object_longhands( $box, 'padding'|'margin' )` and `sgs_corner_object_longhands( $box )`, which
print one declaration per SET side or corner and return `null` when none is; the side shorthand stays for
border width (an unset side SHOULD be 0). **A mobile tier that sets one side keeps the tablet tier's other sides (Bean); `sgs_box_object_shorthand` stays byte-identical, on purpose, for border width and for the `var()` holdouts.** A whole element border goes through
`plugins/sgs-blocks/includes/helpers-border-style.php::sgs_border_element_decls`. Gate:
`plugins/sgs-blocks/scripts/migrate-box-longhands.py --check`.

Both return `null` when every key is empty, so the caller skips the declaration entirely rather
than emitting a no-op rule. **They are NOT interchangeable** — CSS `border-radius` shorthand order
is TL TR BR BL, which is a different sequence from the box-model's TRBL, so passing a corner object
to the 4-side helper silently produces wrong geometry.

⛔ **`sgs_corner_object_shorthand()` takes a MIXED value and guards with `is_array()` internally —
do not "tidy" it to a typed `array` parameter.** Callers legitimately pass a raw null
(`$attributes['borderRadiusTablet'] ?? null`). A typed parameter throws `TypeError` and fatals the
page. **The riskiest existing caller sets the signature, not the tidiest one.**

Enforcement: `plugins/sgs-blocks/scripts/migrate-render-closures.py` owns both families (`--survey` / `--fix` /
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
in `plugins/sgs-blocks/scripts/migrate-length-sanitiser.py`'s `EXCLUDE` list: `testimonial`'s `quoteLineHeight`
(unitless-legal, see the box below) and `google-reviews`' `gr_pct` (a bare percentage the caller
appends its own `%` onto — preset-wrapping a bare number there would emit invalid CSS, the same
failure mode the hardened function exists to remove).

⛔ **The hardened function must NEVER be used for a UNITLESS-LEGAL property** — `line-height`,
`opacity`, `z-index`, `flex-grow/shrink`, `font-weight`, `order`, `aspect-ratio`. It maps a bare
integer to a **spacing** preset, so `line-height: 2` would become
`line-height: var(--wp--preset--spacing--2)` — a length token on a unitless property. Exactly **one** call site is unitless-legal (`testimonial/render.php` `quoteLineHeight`)
and stays on the crude function; every other call site is length-valued.

### (b) Base serialises SCOPED, not dropped and not inline
**Keep the support + `__experimentalSkipSerialization` + serialise scoped — never drop the support.** WordPress's `get_block_wrapper_attributes()` auto-inlines any declared `supports.spacing`/`supports.__experimentalBorder` value — that inlining IS the defect class, not the support's existence. The fix: flip serialisation from auto-inline to scoped, per property, via `__experimentalSkipSerialization`, then write the block's resolved `style.spacing.padding` / `style.border.radius` object to its own **CLASS-LEVEL** scoped selector — `.{$uid}.{block-root-class}` (specificity 0,2,0), **NOT** `#{$uid}` — using the stable core API `wp_style_engine_get_styles($style, ['selector' => $scoped_selector])['css']` (the base tier of a box-family attr serialises this way, with `__experimentalSkipSerialization` on the shared helpers `SGS_Container_Wrapper`, `sgs_typography_css_rule`, `sgs_button_element_style_css` and `sgs_responsive_css_rule`), **registered into the shared SGS collector (FR-32-11 / §6.2) on the frontend** (echoed inline only in the editor context). This is exactly how WP core outputs `layout` support (a `.wp-container-{id}` rule, not inline) — not a bespoke SGS mechanism. **Class-level, never ID:** WordPress core (6.6 `:root :where()` = 0-1-0), Kadence, Spectra and GenerateBlocks all keep per-instance styling at low/equal specificity and resolve overrides by SOURCE ORDER, never by ID/`!important` escalation. Emitting per-instance styling at `#uid` would make it un-overridable by the equal-specificity `sgsCustomCss` residual (FR-32-13) — a render-precedence defect. Every block therefore emits per-instance styling at class-level; any `#uid` emitter is normalised. `skipSerialization` suppresses only WP's *auto-inline output*; it does NOT stop the `style` attribute being populated, so render.php still reads it to emit the scoped rule. Container base spacing serialises scoped with zero inline declarations on the rendered element.

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
| SGS custom root (4-corner) | `borderRadius` | every block with a root radius | one tier object `{desktop,tablet,mobile}`, each a corner object `{topLeft,…}` (read by `sgs_border_radius_tiers()`); WordPress's native `style.border` is never read |
| SGS custom (4-corner) | `splitMediaBorderRadius{TL,TR,BL,BR}` | `hero` | SGS custom corner object + corner control |

**KEEP scalar (not box properties, or single-side):**

| Family | Blocks | Why not an object |
|---|---|---|
| `attributionMarginTop` | quote | Single side only — a 4-side BoxControl would show 3 dead controls |
| `labelMarginBottom` | option-picker | Single side |
| `quoteMarginBottom` | testimonial | Single side |
| `shapeDivider{Top,Bottom}` + `…Colour/Flip/Height/Invert` | container, cta-section, hero, site-footer, site-header, trust-bar | Not a box property — two independent decorative SVG slots each with its own sub-settings; `{top,right,bottom,left}` is semantically wrong (no left/right divider). Keep the named-slot structure. |

> **`box_family` is seeded declaratively and guards every merge.** The `block_attributes.box_family`
> DB column is seeded only for the genuine box families, from each block's own
> `supports.sgs.boxFamilies` in its block.json (family -> [object attr, ...]) by
> `plugins/sgs-blocks/scripts/sgs-update-v2.py::_collect_boxfamily_overrides`, never from a dict. A full
> `/sgs-update` reproduces the seed byte-identically; the keep-scalar families below carry no row (NULL)
> by construction. Adding a family means declaring it in the block's `block.json`. Any per-side or
> per-corner grouping or migration operation MUST query `box_family`, never a name regex
> (`.*Top$` is the anti-pattern); `plugins/sgs-blocks/scripts/check-box-family-guard.py` is the
> plant-tested gate that fails the build when one runs without that check.

Note: `sgs/button`/`sgs/heading`/`sgs/quote`/`sgs/text`/`sgs/container` route border colour/width/style via **CUSTOM attrs** (`supports.__experimentalBorder` is NULL on button; only `sgs/container`'s radius still rides `__experimentalBorder`, skip-serialised). This is the same private-attr path on every block using `SgsBorderControl` (`git grep -l '<SgsBorderControl' -- 'plugins/sgs-blocks/src/blocks/*/edit.js' | wc -l`). The categorisation guard is keyed on the DB `box_family` value, never the routing path.

### (d) FR-32-10 — pipeline extraction + block consumption
**FR-32-10** — The cloning route (Spec 47; `scripts/computed-route/lib/resolve.mjs`) extracts a draft's per-side/per-corner box CSS into the named-object shape: a draft `padding: 12px 18px 12px 18px` (or the equivalent 4 discrete declarations) resolves to `{ "top": "12px", "right": "18px", "bottom": "12px", "left": "18px" }` on the owning attr (the cloning route's cross-declaration accumulator, Spec 47), never 4 flat attrs. The block consumes the object via the shared responsive **BoxControl** wrapper component in `edit.js` (device-tier switcher selects base/tablet/mobile; `onChange` writes the object) and reads it in `render.php`/the shared helper to emit the scoped rule per (b). *Done when:* an asymmetric draft box (4 distinct side values) round-trips to 4 distinct correct computed values live, and the editor BoxControl preview matches the frontend.

### (e) Per-instance override channel
Consistent with FR-32-4: a per-instance override on a box-object property is a CSS custom-property **VALUE**, never an inline property declaration. The **only** non-attr styling output permitted anywhere in this contract is a genuinely non-device-tier breakpoint rule (the `sgsCustomCss` residual, FR-32-13), the sole legitimate use of the block's `sgsCustomCss` (Additional-CSS) field — every other override flows through the object attr + scoped `<style>`, never a bespoke inline escape hatch.

### (f) Border defaults (Bean, 2026-10-05)

A border setting's default is a border style of `solid` and a border width of 0, so a block paints no border until the client sets a width. A block's own default never draws a border the client did not ask for.

Exceptional types keep a stylesheet border by design: outline and ghost buttons, inputs, selectable pills and swatches, dividers, glyphs drawn with borders, transparent borders that reserve space, forced-colours rules, and Google-branded buttons (the google-reviews buttons). A style variant whose name says border (a bordered card, an outlined button) keeps its border, written inside `:where()` so a client's width setting still wins at zero specificity. The one place the style default stays empty is multi-button's `childBtnBorderStyle`, which is `''` so a button without a border setting inherits its own variant.

The editor shows a border preview through one function, `plugins/sgs-blocks/src/utils/border-preview.js::sgsBorderPreview`, the twin of `SgsBorderControl`'s output; the editor marks a selected block with an outline, never a border.

Gates: `plugins/sgs-blocks/scripts/check-border-width-defaults.py` (a border width default above 0, or a stylesheet border outside the exceptional types and outside `:where()`, fails) and `plugins/sgs-blocks/scripts/check-border-preview-twin.js` (a canvas preview that rebuilds border CSS instead of calling `sgsBorderPreview` fails), both under `plugins/sgs-blocks/`.

## 6.2 CSS output consolidation (FR-32-11)

**Status: BUILT.** Encodes the collector + file-default output. Implementation detail: `.claude/plans/archive/2026-07-12-style-tag-consolidation-design.md`.

**Problem.** §6.1(b)'s scoped `<style>` is emitted per block instance into the page body — on a representative live page: ~100 body `<style>` tags, ~33KB. Compliant (§6.1(b) sanctions the scoped `<style>`) but bloated + non-cacheable. The industry-settled fix (WP core / Kadence / Spectra / GenerateBlocks): register each block's CSS into a central collector; flush once.

### (a) The collector — `plugins/sgs-blocks/includes/class-sgs-css-registry.php` (BUILT)
Implemented as a **single `render_block` chokepoint**, NOT ~60 per-block emit-site edits: a late (`priority 99`) `render_block` filter lifts every `<style>` tag out of each `sgs/*` block's rendered HTML into a per-request buffer (`sgs_collect_css`, deduped by content hash, insertion order preserved so the `sgsCustomCss` residual lands last). This captures all 6 emit shapes — including the container wrapper's prepended tag and `custom-css.php`'s appended residual — **without touching either file**, and is inherently universal (R-31-9).
- **Editor split (CRITICAL):** the lift filter + the head buffer are gated to a genuine front-end render via `sgs_is_frontend_render()` = `! is_admin() && ! wp_is_serving_rest_request()` (WP 6.5+; the naive `! is_admin()` is WRONG — false during REST — which would strip the ServerSideRender editor previews' `<style>` into a buffer that never emits → unstyled canvas). The block-renderer REST route (`context=edit`) keeps the block's `<style>` inline; the frontend consolidates.

> **Injector contract.** The p99 lift above assumes every `render_block` filter that writes into a
> block's markup appends AFTER the leading scoped `<style>` tag. An injector that assumes
> **first-tag-is-root** and inserts its class/attribute/overlay output INSIDE that leading `<style>`
> string has that output silently **stripped along with the style tag** by the p99 lift, erasing both
> the injected markup and the evidence it ever ran. The `render_block` injectors
> (`hover-effects/hover-effects.php`, `animation-attributes.php`, `parallax.php`, `image-controls.php`) therefore
> skip-offset past the leading `style`/`script` tags before inserting.
>
> Injectors' per-instance `--var` writes MUST NOT ride inline `style="--var:…"`: an inline write into
> the stripped `<style>` string vanishes, leaving var-driven features (hover-effects, parallax
> strength, image-controls object-fit) functionally dead while the live no-inline gate has nothing to
> catch. They go through the shared helper `plugins/sgs-blocks/includes/helpers-scoped-instance-vars.php` (reuse-or-mint
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
CSS **generation** is untouched — every helper (`sgs_typography_css_rule`, `sgs_label_box_css_rule`, `sgs_responsive_css_rule`, `SGS_Container_Wrapper`, …) still builds the same string; the collector only relocates the finished `<style>`. Render-side only; no block version bump. Spec 32 §6.1 no-inline compliance is unchanged.

### (d) Output shape (canary)
`head` mode: one `<style id="sgs-blocks-collected">` in the head, 0 body tags. `file` mode: one `<link id="sgs-blocks-collected-css">` in the head (immutable-cached), 0 body tags, stable under LiteSpeed page cache (loads 4–7 consistent), correct cascade (link after block CSS). Both: hero/button/label-capsule/trial-tag computed values correct at 375/768/1440, `sgsCustomCss` residual precedence intact, 0 console errors, editor canvas still styled.

## 6.3 Grid-item defaults cascade — `--sgs-gi-*`

This section records the grid-item defaults mechanism so it need not be re-derived from `container/style.css`.

**FR-32-12** — A grid CONTAINER parent may set `--sgs-gi-padding-{top|right|bottom|left}` / `--sgs-gi-bg` /
`--sgs-gi-radius-{top-left|top-right|bottom-right|bottom-left}` / `--sgs-gi-border` / `--sgs-gi-shadow` / `--sgs-gi-color` as
custom-property VALUES on the grid element (padding and radius print one property per side or corner a device tier sets, so a
narrower tier changes only its own; `plugins/sgs-blocks/includes/helpers-responsive.php::sgs_responsive_atoms_from_spec`'s `box` and `corners` options) (`SGS_Container_Wrapper`, built by `plugins/sgs-blocks/includes/helpers-grid-item.php::sgs_grid_item_vars`;
editor UI: `GridItemDefaultsPanel.js` in `plugins/sgs-blocks/src/blocks/container/components/`; the canvas sets the same six variables
on the same element through `plugins/sgs-blocks/src/blocks/container/grid-item-preview.js`). `--sgs-gi-border` resolves its colour
through `sgs_colour_value()`, so a palette slug and a custom colour both paint.

**Scope (Bean, 2026-10-04):** grid-item defaults are one uniform format for **every cell of the grid,
whatever block the cell is** (container, card, info-box, text, any InnerBlock). The one stylesheet consumer, in
`plugins/sgs-blocks/src/blocks/container/style.css`, targets every direct child cell at both depths (directly under the grid, and
under its `__inner` band when the grid has band props), at specificity (0,0,0) so a cell's own styling wins; the
band itself, decorative `aria-hidden` layers, the Lottie ground, `style`/`script` and the editor's block appender are
not cells:

```css
:where( .sgs-container--grid > :not( .sgs-container__inner ):not( [aria-hidden="true"] ):not( .sgs-container__lottie-bg ):not( style ):not( script ):not( .block-list-appender ) ),
:where( .sgs-container--grid > .sgs-container__inner > :not( [aria-hidden="true"] ):not( .sgs-container__lottie-bg ):not( style ):not( script ):not( .block-list-appender ) ) {
	padding-top: var( --sgs-gi-padding-top, 0 );
	padding-right: var( --sgs-gi-padding-right, 0 );
	padding-bottom: var( --sgs-gi-padding-bottom, 0 );
	padding-left: var( --sgs-gi-padding-left, 0 );
	background: var( --sgs-gi-bg );
	border-top-left-radius: var( --sgs-gi-radius-top-left );
	border-top-right-radius: var( --sgs-gi-radius-top-right );
	border-bottom-right-radius: var( --sgs-gi-radius-bottom-right );
	border-bottom-left-radius: var( --sgs-gi-radius-bottom-left );
	border: var( --sgs-gi-border );
	box-shadow: var( --sgs-gi-shadow );
	color: var( --sgs-gi-color );
}
```

Each padding side falls back to `0`. The build's minifier folds the four sides into one `padding` shorthand, and a shorthand that reads an unset custom property is invalid and paints no padding, so a grid that sets only its top side would lose it. `plugins/sgs-blocks/tests/js/per-side-var-fallback.test.js` fails any block stylesheet that reads four bare per-side custom properties.

Of the six values only text colour reaches the cell's own children, by normal inheritance of `color`; the six
variables are reset to `initial` on each cell's children, so a grid nested inside a cell starts from its own
defaults. The per-instance hover, gradient and text-colour rules (`plugins/sgs-blocks/includes/helpers-grid-item.php::sgs_grid_item_state_css`)
cover both depths at specificity (0,1,0) through `.{uid} > :where( cell )`, so a cell's own scoped rule, printed
later, still wins. `container/editor.css` marks cells with an outline, never a border, so it does not override
`--sgs-gi-border` in the canvas.

**Eligibility:** a block mounts a grid-item-defaults panel when it renders the variables on the
element whose direct children are its grid cells. Read the block's own `render.php`/`save.js`
output to decide it, never `block_composition.container_kind` (that column classifies the
cloning layer model, see Spec 02's Composite wrapper rule, not a block's own markup).

**No dead mounts:** only `sgs/container` declares `gridItem*` attributes and mounts `GridItemDefaultsPanel`.
Verify: `git grep -n "GridItemDefaultsPanel" -- 'plugins/sgs-blocks/src/blocks/*/edit.js'` and
`git grep -ln '"gridItem' -- 'plugins/sgs-blocks/src/blocks/*/block.json'`.

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
| FR-32-1 | Any `style` attribute content on a live `sgs-` element — property declarations OR `--var` values OR empty `style=""` | 0 | ✅ **0 across 150 `sgs-` elements**; the probe button's `style` attribute is `null`. (`audit-inline-styling.js --check` → 0 violations) |
| FR-32-3 | Primary button computed bg/color on `:hover` vs normal | differ | ✅ hover computed values differ from resting; rules are stylesheet rules, not inline |
| FR-32-2/5 | Re-skin: change only snapshot `buttonPresets.primary.text` → live button text colour changes | yes | ✅ `rgb(58,46,38)` → `rgb(255,0,255)` on a token-only change, **no block-code change**; reverted and re-verified back to `rgb(58,46,38)` |
| FR-32-8 | Cloned naked draft link (no button class) becomes a preset button | never | ✅ naked links do not acquire `sgs-button--primary` |
| FR-32-6 | Fresh button with `buttonPresets` absent still renders correct colours | yes | ✅ key removed from the snapshot and pushed: fell back to the theme token `#fffaf5` (`text-inverse`) and rendered correctly — **the fallback path actually RUNNING, not merely verified in code**. Restored |

## 10. Button styling model

- **Styling model.** The button styles only through the BEM variant class + token vars. `inheritStyle` is the variant selector that drives the BEM class; there is no "Apply preset" inline colour painting. **`plugins/sgs-blocks/src/blocks/button/presets.js` is RETAINED** — it is reused by `sgs/product-card`'s CTA "Apply preset" control; the button block itself does not consume it for styling. Do not treat this file as dead — check its live import graph before touching it. Pre-production (no deprecations): existing dev/canary buttons are re-cloned, not migrated.
- **Button presets are native theme.json `settings.custom.buttonPresets` (plus the Customiser panel); there is no Settings page and no `wp_options` bridge (Bean-approved, Spec 11 Decision 22).** Locked inline presets are removed (D283, Bean-approved) and there are no deprecations pre-production (D270/D271/D293).
- This spec is the operative styling contract. Spec 11 is the button's attribute-surface / feature reference.

## 11. Design questions — answers as shipped

| Question | Owner | Answer, as shipped | Evidence |
|---|---|---|---|
| Does product-card's `cta*` set fold into `cardPresets`, or reuse `buttonPresets`? | Claude | **REUSE `buttonPresets`.** No `cardPresets` group exists. The CTA's colour is governed entirely by the shared `.sgs-button` / `.sgs-button--{preset}` class channel under the composite wrapper rule; per-block divergent CTA rules are a bug under composite wrapper | `plugins/sgs-blocks/src/blocks/product-card/style.css::.product-card .sgs-button` (colour + layout composite wrapper) |
| Block-scoped override var, or a shared cross-block name? | Claude | **BLOCK-SCOPED, as proposed.** Every block uses its own prefixed namespace — `--sgs-btn-*`, `--sgs-op-*`, `--sgs-mb-btn-*`, `--sgs-social-*`, `--sgs-trust-badge-*` | `button/style.css`, `option-picker/style.css`, `multi-button/render.php` |
| Outline hover border — keep draft-faithful `var(--primary)`, or update the draft to `primary-dark`? | Bean | **DRAFT-FAITHFUL `primary` kept.** The outline preset's hover-border falls back to `var(--wp--preset--color--primary)`; the draft was not changed | `plugins/sgs-blocks/src/blocks/button/style.css::.sgs-button--outline` |

## 11b. Enforcement surface — the gates that hold this contract up

A gate nobody knows about is one refactor away from being deleted as dead weight. These gates
enforce Spec 32 (each names Spec 32 in its own docstring):

| Gate | Blocking? | What it enforces | Spec clause |
|---|---|---|---|
| **`plugins/sgs-blocks/scripts/audit-inline-styling.js`** | yes | Static: no `sgs/*` block emits an inline `style` property declaration | FR-32-1 |
| **`plugins/sgs-blocks/scripts/no-inline/check-no-inline.py`** | yes (`--live-default`) | **LIVE** counterpart to the above — hits a real canary URL and fails if any rendered `sgs-` element carries an inline `style`. ⚠ Note the `no-inline/` SUBDIRECTORY; citing it bare is a known trap. ⚠ It **WARNS and PASSES when the canary is unreachable**, so a green run on a disconnected machine proves nothing | FR-32-1 / FR-32-4 |
| **`plugins/sgs-blocks/scripts/check-id-scoped-emits.js`** | yes | Every per-instance scoped rule is emitted at CLASS level (`.{uid}.{block}` = 0,2,0), never at `#{uid}` — without which the `sgsCustomCss` residual cannot override by source order | **§6.1(b)** |
| **`plugins/sgs-blocks/scripts/no-inline/check-stranded-guards.py`** | yes | Catches `:not([style*="…"])` fallback guards STRANDED by the no-inline contract. Under this contract no block emits an inline `style`, so such a guard always matches, becomes unconditional, and blocks inheritance | §6.1(b) consequence |
| **`plugins/sgs-blocks/scripts/check-style-blob-sanitisation.py`** | yes | `wp_strip_all_tags()` around every literal `<style>` emit site | §5 Security |
| **`plugins/sgs-blocks/scripts/check-border-width-defaults.py`** | yes | Border width defaults are 0 outside the exceptional types; border-named styles keep their border inside `:where()` | §6.1(f) |
| **`plugins/sgs-blocks/scripts/check-border-preview-twin.js`** | yes | Canvas border previews go through `sgsBorderPreview`, never a rebuilt copy | §6.1(f) |
| `plugins/sgs-blocks/scripts/check-shared-css-state-rules.js` | yes | State-only shared-CSS size literal with no resting-value base rule | Adjacent to FR-32-3 / §6.2 — flagged, not asserted |

Related mappings:
- **CSS output mechanism** — every function in `class-sgs-css-registry.php` (`sgs_collect_css`, `sgs_css_epoch`, `sgs_css_bump_epoch`, `sgs_css_gc`, `sgs_css_write_htaccess`) is described in §6.2(a)/(b)/(d).
- **`supports.sgs` keys** — `boxFamilies` is §6.1's; `elements` is Spec 35's; `containerKind` and `presetSelectors` are declared in each block's block.json under `supports.sgs` (the roster is the DB `block_composition.container_kind`; KINDs are Spec 02's Composite wrapper rule); `imageControls` is root `CLAUDE.md`'s.

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

### 12.2 Full palette semantics

> **This is the FRAMEWORK roster, read from `theme/sgs-theme/theme.json`**
> (`python -c "import json;print(len(json.load(open('theme/sgs-theme/theme.json'))['settings']['color']['palette']))"`
> prints the count). A client palette may legitimately be LONGER (see §12.5(b)); it may not be shorter.
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
| Raised | `surface-alt` | brand-strip tile bg + hover; countdown-timer `--elevated`/`--filled`; accordion `--card` item; button outline hover bg fallback; cta-section gradient; card-grid card bg + hover; buybox `value-ladder` selected row; form hover/preview-box states; google-reviews card, avatar and badge; info-box `--elevated`/`--filled`; modal dialog panel; product-faq hover/open; post-grid card + shimmer; product-card no-image box / media / thumb-strip bg (generic `#f5f7f7` fallback) and `value-ladder` selected row; product-search; table-of-contents `--card`; tabs; team-member; testimonial classic-card / rating-led / corporate-logo / case-study-media / pull-quote-editorial; trust-bar |
| Inverse ink | `text-inverse` | `color:` on a coloured/dark fill: business-info icon/text on the primary-filled button; cta-section text; card-grid; google-reviews dark-theme review text; hero; product-card badge fg default; process-steps; social-icons; label |
| Substrate | `surface` | The deliberate-blend cases in §12.4 |

`sgs/testimonial-slider` uses `surface` for one background fill (`testimonial-slider/style.css`); classify it under §12.1 before changing it.

### 12.4 The "deliberate blend" pattern — when `surface` on a component background is CORRECT, not a bug

A handful of components use `surface` as their OWN resting-state background even though they are not
literally the page. This is legitimate, not an instance of the bug, when BOTH are true:
1. The component's shape/boundary is defined by a `border`, not by a fill contrast against the page.
2. An interaction state (hover/open/selected) explicitly switches the SAME element to `surface-alt` (or
   vice versa) as the visible signal that something changed.

Examples kept as `surface` under this rule: accordion item header at rest (no ground change on
hover or open by default; the block's header background settings add one), the FAQ item base (`product-faq`, same pattern), the option-picker `--soft` resting pill
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
`border` (§12.2) is meant to be a quiet neutral divider; a saturated brand hue there is a role violation. Reproduce:
`python -c "import json,glob;[print(f,{x['slug']:x['color'] for x in json.load(open(f))['settings']['color']['palette']}.get('border')) for f in sorted(glob.glob('sites/*/theme-snapshot.json'))]"`.
Per-client findings are not recorded in this spec: they change with every re-extraction, and the values live in `sites/<client>/theme-snapshot.json`.

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

**Rule for the `border` slot (§12.5(a)).** The fix for a saturated `border` is to re-derive it as a low-chroma neutral near that site's `surface`/`surface-alt` tones, the way `helping-doctors` and `eye-care-ward-end` have it. That is a per-client `theme-snapshot.json` VALUE change and needs Bean's explicit go-ahead.

**Not built: an extractor guard for `border`.** `plugins/sgs-blocks/scripts/theme-extractor/` accepts a saturated `border` from a draft's declared palette. A guard that re-derives a high-chroma `border` as a low-chroma neutral near the site's `surface` would fix every future client at once and leave existing snapshots untouched; no client palette is changed by hand (draft client setups under `sites/` are not real clients).

**Rule for `surface-alt` distinctness.** A pair whose `surface` and `surface-alt` differ by only a few RGB units makes raised blocks (§12.3) look flat. If the declared `surface-alt` is a token in the source draft, changing it overwrites draft content rather than fixing an extraction bug, so the fix is a value change in `sites/<client>/theme-snapshot.json` and in the source draft's declaration, never a code change. Measure the pair with the §12.5(a)-style command before proposing a change.

### 12.7 Verification method (rule 4a — computed, content-keyed, not source-diff) + extractor proof

"Does the fix work" for a colour-role change means computed styles of the rendered element, not a
diff of source declarations: read `getComputedStyle` on the elements against the intended slug's
resolved hex. A token swap in a fallback chain reads through to the same computed value in every
browser.

**The extractor guard (FR-33-2 in Part D, `plugins/sgs-blocks/scripts/theme-extractor/palette.py::_synthesise_surface_alt`)**
prevents a re-extracted snapshot from recreating the `surface`/`surface-alt` collision:
- A draft with NO content/card background signal at all still emits a distinct `surface-alt`:
  - dark surface `#222831` → synthesised `surface-alt` = `#2f353d` (`_source: "derived"`)
  - light surface `#fbf3dc` (Mama's own hex) → synthesised `surface-alt` = `#ece4cf` (`_source: "derived"`)
- The `surface-alt` role keeps low identity-claim confidence plus a nothing-claimed-it-yet synthesis
  fallback, so the regression guard `test_client_colour_keeps_raw_token_slug_not_custom` (in
  `plugins/sgs-blocks/scripts/theme-extractor/tests/test_extractor.py`) holds.
- Command: `python -m pytest tests/test_extractor.py` from `plugins/sgs-blocks/scripts/theme-extractor/`.

---

# PART B. Global styles and theming

## 13. Global styles and theming

### 13.1 The model

SGS is one block theme serving many client sites. Part B records how a site's global styles reach the screen and how a push reaches that layer.

- **WordPress merge order:** `default → blocks → theme (theme.json) → custom (the wp_global_styles post)`. The merge happens in PHP (`WP_Theme_JSON_Resolver::get_merged_data('custom')`) and is then emitted as `global-styles-inline-css`. The custom layer wins at the **data** layer; it is not a CSS-specificity override.
- **`theme.json` is the factory-default seed; the `wp_global_styles` post is the live, edited house style** (what a site actually renders). A write that only replaces `theme.json` on disk is silently overridden for every property the post already defines.
- **Per-instance block values** are block attributes. They print as a class-level scoped rule (Part A, FR-32-4 and §6.1(b)) and win over the global defaults through the normal cascade. There is no separate override layer: an "override" is a real value set on one block instance.
- **The inspector reads the merged custom-origin value** (WordPress 7.0), so a control's starting state reflects a Site Editor global edit rather than the `theme.json` seed.
- **Scalar styles versus preset arrays.** The seed/live model holds for scalar style values. It does not hold for preset arrays (`spacing.spacingSizes`, `shadow.presets`, `typography.fontSizes`): see FR-26-D3.

### 13.2 Per-client source of truth

- **`sites/<client>/theme-snapshot.json` is the per-client source of truth.** It is a full `theme.json` (Part C). `plugins/sgs-blocks/scripts/push-theme-snapshot.py` ships it to the site's theme directory wholesale and posts its `styles` and `settings` to the live `wp_global_styles` post.
- **`theme/sgs-theme/styles/` stays empty in the repository.** SGS does not ship per-client WordPress style variations; the Browse Styles picker is hidden unless the `sgs_show_browse_styles` filter returns true (`theme/sgs-theme/functions.php`, the `block_editor_settings_all` filter).
- **A framework `theme.json` change does not reach a client by itself.** The snapshot replaces the framework file for that client, and a preset missing from a snapshot is deleted for that client. The extractor overlays the base palette (FR-33-16) and `--merge-onto` preserves an existing snapshot's extra slugs, so a re-extraction is how a baseline change reaches a client.
- **No client-specific value in the framework baseline `theme.json` or `style.css`.**

### 13.3 Hard constraints

- R-31-1 DB-first, R-31-9 universal mechanism and R-31-14 no legacy fallback (`.claude/rules/framework-principles.md`).
- WCAG 2.1 AA baseline with 2.2's cheap wins (visible focus, 44px targets); mobile-first; vanilla JS with `viewScriptModule`.
- Clients use the block editor and Site Editor exclusively, never code or the command line.

### 13.4 Requirements

#### Group A: sync

**FR-26-A3 — Sync through the WordPress-native REST endpoint.** No new endpoint, ability or plugin code, and no Create Block Theme runtime dependency.
- **Push (BUILT, see FR-26-D2):** write the snapshot on disk and `POST /wp/v2/global-styles/{id}` with the snapshot's `styles` and `settings`, using an application password from `.claude/secrets/<site>.env`. The post id is discovered over SSH with `wp post list --post_type=wp_global_styles`.
- **Pull (NOT BUILT):** folding a Site Editor edit back into the client's snapshot. The pre-push read of the live post (backup, drift diff, Font Library carry-over, FR-33-11) exists, but nothing writes a Site Editor edit back into `sites/<client>/theme-snapshot.json`.
- *Done when:* a push changes a live-visible style with no manual REST step (met); a pull captures a Site Editor edit back into the snapshot (not met).

**FR-26-A4 — Pre-deploy guard (BUILT).** Before any push, the live `wp_global_styles` post is read; user-edited content that differs from the incoming snapshot raises a warning before it is overwritten. Carried by `push-theme-snapshot.py::drift_warning` and `::backup_gate` (FR-33-11).
- *Done when:* pushing to a site whose post has user edits surfaces a warning and requires confirmation before overwriting.

**FR-26-A5 — The WordPress-native surface (rationale, not a build item).** There is no `wp global-styles` WP-CLI command, no core "write global styles" Ability (the WordPress 7.0 Abilities/MCP adapter ships none), and Create Block Theme is GUI-only. The programmatic surface is the `/wp/v2/global-styles` REST endpoints, which is why FR-26-A3 extends the existing script. No future session builds a redundant endpoint or ability.

#### Group B: block styling model

**FR-26-B1 — Raw custom values enabled framework-wide (BUILT).** `theme/sgs-theme/theme.json` sets `settings.color.custom`, `customGradient` and `customDuotone`, `settings.spacing.customSpacingSize: true`, the full `spacing.units` list and `appearanceTools: true`, so every colour and spacing control accepts a raw hex or length as well as a preset.
- *Done when:* a block colour or spacing control accepts a raw value (`420px`, `#3A2E26`) in the editor and persists it.

**FR-26-B2 — Presets-prominent inspector UX (owned by Spec 35).** Brand presets show first; a secondary "Custom" control reveals the raw picker; a swatch shows its label and hex on hover. The colour-control placement standard is Spec 35's; `plugins/sgs-blocks/src/components/DesignTokenPicker.js` is the shared picker. Status: this FR's hover-label detail has not been re-verified in the editor.

**FR-26-B3 — Overridable-default custom-property pattern (BUILT as FR-32-2 and FR-32-4).** Every framework default colour or spacing is `property: var(--sgs-x, <default>)`; a per-instance value wins through the normal cascade, with no `!important`.

**FR-26-B4 — Per-block raw-control gate (NOT BUILT).** Every global property that can affect a block must expose a per-instance control that accepts a raw value, enforced by a QC script rather than per-block discipline. No gate asserts this today (`plugins/sgs-blocks/scripts/check-raw-box-control.py` asserts a different rule: that 4-side box editors are `SgsBoxControl`).
- *Done when:* a script asserts, per block, that each affecting global property has a raw-accepting control, and a non-conforming block fails it.

**FR-26-B6 — The inspector reads the merged custom-origin value (PARTLY BUILT).** SGS custom inspector panels read the merged value (`useSettings`, `wp_get_global_styles`) as a control's initial state, never the raw `theme.json` default. Many `edit.js` files read `useSettings`; no gate asserts it across blocks.
- *Done when:* a control's initial value reflects a Site Editor global override, not the seed.

#### Group D: push rules

**FR-26-D2 — REST write in `push-theme-snapshot.py` (BUILT).** A push writes the snapshot's `styles` and `settings` to the live `wp_global_styles` post (`plugins/sgs-blocks/scripts/push-theme-snapshot.py::post_global_styles`). A site with no post yet is a fresh site: the disk push is the whole deployment.
- *Done when:* a `push-theme-snapshot` run changes a live style via the post, verified live.

**FR-26-D3 — Preset arrays are theme-layer only; never written to the user layer (BUILT).**

The seed/live model of §13.1 holds for scalar style values. It does not hold for preset arrays (`spacing.spacingSizes`, `shadow.presets`, `typography.fontSizes`, `color.palette`), and FR-26-D2 posting the snapshot's entire `settings` object wrote them to both layers.

*Why this is a duplicate, not an override.* WordPress stores presets keyed by origin (`default` / `theme` / `custom`) and folds them into one slug-keyed map in `WP_Theme_JSON::get_settings_values_by_slug`. A preset posted to the user layer lands under `custom` and sits alongside the `theme` copy. Same slug: the later origin wins (harmless). Different slug: both survive, and editor pickers that concatenate origins show the ladder twice. A posted `typography.fontSizes` also re-admitted WordPress's core-default `medium` size (fluid) even with `defaultFontSizes: false` set in every layer.

*Rule.* `push-theme-snapshot.py::strip_user_layer_presets` strips the paths in `_USER_LAYER_PRESET_STRIP` (`spacing.spacingSizes`, `shadow.presets`, `typography.fontSizes`) from the global-styles POST body only, never from the snapshot written to disk; the disk push already delivers them at the `theme` origin. Omitting rather than nulling is sufficient: the REST controller does `$config['settings'] = $request['settings']` in WordPress core's `class-wp-rest-global-styles-controller.php` (replace, not merge; cite the assignment, not a line number), so omission also clears a stale user-layer copy.

- **Not stripped, deliberately:** `color.palette`, `color.gradients` and `typography.fontFamilies`. They genuinely differ per client, and the user layer is the only place a Site Editor edit to them can live (Font Library installs land in `fontFamilies`; `push-theme-snapshot.py::keep_font_library_families` carries them over). `color.duotone` is in neither the framework `theme.json` nor any snapshot, so it is not listed.
- **The snapshot is the deployed `theme.json`.** `push_snapshot` copies it over `wp-content/themes/sgs-theme/theme.json` wholesale, not as a patch. A preset missing from a snapshot is deleted for that client and does not fall back to the framework file. That is why every snapshot carries its own `defaultSpacingSizes` and `defaultFontSizes: false`.
- **The `default*Sizes` flags do not delete WordPress defaults.** Per core's `PRESETS_METADATA` `prevent_override`, the flag stops core discarding a theme preset that collides with a default slug, so the theme wins a collision. A default with no colliding theme slug survives. SGS's spacing ladder (slugs `10` to `80`) displaces WordPress's (`20` to `80`) on that basis, while SGS's shadows (`subtle`, `raised`, `floating`, `glow`) coexist with WordPress's (`natural`, `deep`, `sharp`, `outlined`, `crisp`) because no slug overlaps. **Bean ruled 2026-08-07 that both shadow sets stay: they are different design languages (SGS soft and centred; WordPress diagonal, three with zero blur), so none is redundant.**

*Done when:* a push leaves `wp_global_styles` with none of the stripped paths while the live page still resolves the SGS ladder.

### 13.5 Flow

```
sites/<client>/theme-snapshot.json   per-client source of truth (git-tracked, Part C)
        │  push-theme-snapshot.py
        │    disk  -> wp-content/themes/sgs-theme/theme.json   (theme origin, wholesale)
        │    REST  -> POST /wp/v2/global-styles/{id}           (user origin, strip list of FR-26-D3)
        │    guard -> backup + drift warning before overwrite  (FR-26-A4 / FR-33-11)
        ▼
wp_global_styles post (Site Editor layer)  <- what the site renders
        ▲
Block editor: presets prominent, raw values accepted, per-instance wins by cascade.
```

---

# PART C. The theme-snapshot format

## 14. `sites/<client>/theme-snapshot.json`

### 14.1 What it is

One file per client: a complete WordPress `theme.json` (schema v3) holding that client's design tokens. It is the only place per-client colours, type, spacing and component presets live; no client value appears in the theme or plugins (root `CLAUDE.md`). Generated files are never hand-edited to fix a draft-derived value: the extractor (Part D) writes it, `push-theme-snapshot.py` deploys it (§13.2, FR-26-D3), and `theme/sgs-theme/styles/` stays empty.

Top-level keys:

| Key | Meaning |
|---|---|
| `$schema`, `version`, `title`, `description` | Standard `theme.json` header. `version` is 3. |
| `settings` | Palette, typography, spacing, layout, shadow, and `settings.custom.*` (§14.3). Pushed to the live post. |
| `styles` | Base colour and typography, `styles.elements.{h1..h6,heading,link,button}`, `styles.blocks`, and a `css` string for component CSS. Pushed to the live post. |
| `templateParts`, `customTemplates` | Standard `theme.json` declarations. |
| `_sgsExtractor` | Internal provenance: `draft_css_sha256`, `extractor_version`, and for a Claude Design draft `draft_source_sha256` and `source_draft` (the file name). Travels in the file; WordPress ignores it; never posted. |
| `_sgsDark` | Internal opt-in for the automatic dark palette (FR-33-20): `{ enabled, palette, roles }`. Removed before deploy by `push-theme-snapshot.py::apply_dark_palette`. |

Entry-level internal keys: `_source` (`declared`, `derived` or `rendered`, FR-33-1), `advisory: true` on a derived palette entry (FR-33-5), and `_baseline_color` on an advisory entry that overlays a base slug (removed by `drop_internal_palette_keys` or consumed by `apply_advisory_policy`; it is not a `theme.json` field).

### 14.2 Target `theme.json` slots (the vocabulary the extractor fills)

The framework `theme/sgs-theme/theme.json` provides these slots; a snapshot fills them per client.

- `settings.color.palette`: the framework slug roster (§12.2), raw hex allowed, overlaid per client (FR-33-16). A client palette may be longer than the roster, never shorter.
- `settings.typography.fontFamilies` (body, heading, display and one entry per loaded-and-rendered family, FR-33-18, each with `fontFace` where self-hosted) and `fontSizes` (a non-fluid ladder). `settings.typography.fluid` is declared but no preset opts in.
- `settings.spacing.spacingSizes`, `settings.shadow.presets`, `settings.layout.{contentSize,wideSize}` (FR-33-19).
- `settings.custom.*` (§14.3).
- `styles.typography` (the base body), `styles.color`, `styles.elements.*`.

A draft's authored `clamp()`, `calc()` or `min()` size is emitted verbatim as the `size` string (`theme.json` accepts it); routing it through WordPress's fluid formula recomputes a different curve (FR-33-4). Reserve `fluid: {min, max}` for sizes the draft did not already clamp.

### 14.3 `settings.custom` keys and the `{component}Presets` contract

`settings.custom.{component}Presets.{variant}.{role}` is the per-client component token contract of Part A (FR-32-5, FR-32-9, §7). WordPress derives `--wp--custom--{component}-presets--{variant}--{role}` at `:root`. The role vocabulary is fixed by FR-32-9; a component whose painted parts are not a box names its own roles in its own namespace (`measuredDiagramPresets`).

Other `settings.custom` keys a snapshot carries:

| Key | Holds | Consumer |
|---|---|---|
| `buttonPresets` | `primary`, `secondary`, `outline`, plus an optional `default` entry holding only `hover-transform` and `hover-transition` | `plugins/sgs-blocks/src/blocks/button/style.css` (FR-32-2, FR-33-4) |
| `borderRadius` | `small`, `medium`, `large`, `pill` | block stylesheets |
| `transition`, `duration`, `easing`, `focus-ring`, `entrance`, `linkSweep`, `shadowHover`, `shadowColour` | motion and state tokens | theme and block stylesheets |
| `accentSets` | alternative accent sets as CSS variables, not picker swatches (FR-33-16) | the draft's variant switch |
| `dark`, `darkInk` | derived dark palette and fill-scoped ink (FR-33-20) | `theme/sgs-theme/functions.php` (`dark_mode_mapping_css`, `dark_mode_ink_css`) |
| `header`, `footer` | reserved, empty, for header and footer component tokens (FR-33-13) | Spec 37 decides use |
| `sgs.headerPattern`, `sgs.footerPattern` | non-empty `sgs/`-prefixed pattern slugs | `plugins/sgs-blocks/includes/class-sgs-template-part-seeder.php`; asserted by `plugins/sgs-blocks/tests/php/ThemeSnapshotManifestTest.php` |

**A snapshot key needs a reader.** A key that no stylesheet or PHP reader consumes paints nothing; add the consumer in the same change that adds the key. Every consumed token has a framework-default fallback (FR-32-6), so a snapshot without a component's `{component}Presets` still renders.

### 14.4 Deployment (what `push-theme-snapshot.py` does with the file)

1. **Prepare** (`prepare_deploy_snapshot`, the one function both the push and `plugins/sgs-blocks/scripts/build-deploy.py` use): resolve advisory palette entries (FR-33-5), then derive the dark palette and strip `_sgsDark` (FR-33-20). `deploy_theme_json_bytes` returns the exact bytes shipped as the theme's `theme.json`, so a theme deploy and a snapshot push cannot ship different files for one client.
2. **Disk:** copy to `wp-content/themes/sgs-theme/theme.json` over SSH, wholesale.
3. **User layer:** `POST /wp/v2/global-styles/{id}` with `styles` and `settings`, minus the preset arrays of FR-26-D3 and with Font Library families carried over.
4. **Safety:** `--dry-run` diff, backup of both live layers, `--rollback`, drift warning (FR-33-11).

Validation: the extractor validates every emit against the `theme.json` v3 schema before handoff (FR-33-7); `ThemeSnapshotManifestTest` asserts the pattern keys of §14.3.

---

# PART D. The extractor process

## 15. Draft to snapshot: the deterministic extractor

### 15.1 Purpose and the iron law

A **universal, draft-agnostic extractor** reads a client's draft and emits a generated `sites/<client>/theme-snapshot.json` (structured `theme.json` v3 slots, not a raw-CSS blob; format in Part C). `push-theme-snapshot.py` deploys it (§14.4). It runs once per site, before any cloning for that client, and the cloning route snaps values to the snapshot it produces (R-47-7).

Without it a snapshot would be hand-maintained, and nothing would generate it from the draft: the drift source. Because the theme base would then differ from the draft base, every cloned block would inherit the wrong base. An inherited value must come from the rendered root of the draft, not from a hand-maintained snapshot.

> **The one rule that makes this work.** The emitted VALUE is always the COMPUTED value on a real rendered node, never a raw source declaration (Bean's measurement-over-eye rule applied to tokens). A source `:root` or base declaration is used only for the token's NAME and ROLE vocabulary, never as the value to ship. Any requirement that emits a declared value without computed validation breaks this rule.

**Tiered by trust, not by value type.** One build extracts every value type the draft declares (colour, typography, type scale, spacing, radius, shadow, buttons, layout). The trust boundary is provenance:

- **DECLARED (Pass A):** parse the draft's `<head>` `:root` and base/preset rules (with `tinycss2`, not regex), resolve each token's role and value, validate the value against the computed value on a rendered node, then auto-apply.
- **DERIVED (Pass B):** for values the draft does not declare, recover a palette or scale by usage-context clustering and emit it as provisional and advisory, confidence-scored, never auto-pushed to a live theme without human confirmation (FR-33-5). A draft with nothing usable gives the framework baseline unchanged plus a loud logged skip.

Classification is by ROLE inferred from USAGE CONTEXT (which CSS property, on which selector role), never by token name and never by raw frequency: names are unreliable (the same hex is `--success` in one draft and `--green` in another) and raw frequency inverts a palette (the most frequent colour is body-text or border grey, not the brand primary). Frequency ranks only within a role bucket. Colours dedupe at ΔE≤1 (CIEDE2000, sRGB to Lab) with alpha as a separate axis. Fluid `clamp()` is preserved verbatim as the size value. `rem` is resolved against the draft's actual computed `documentElement` font-size, never a hardcoded 16px.

**Out of scope:** the header/footer converter (header/footer are cloned as surfaces by Spec 47; the snapshot only reserves their token namespace, FR-33-13); a new theming or deploy channel (this feeds the existing snapshot and `push-theme-snapshot.py`); any per-client branch (one universal extractor, no `if client ==`, R-31-9).

### 15.2 The process

1. **Measure** (`measure.js`, run in a headless browser): read computed styles on rendered nodes, plus the font census (`font-usage.js`) and the layout census (`layout-census.js`). `--facts <file>` replays a cached measurement.
2. **Parse the declared design** (`token_map.py`): `:root` tokens with `var()` chains and fallbacks; the README token table, the script's variant sets and inline styles for Claude Design drafts (`declared_sources.py`, `variant_sets.py`, `usage_census.py`).
3. **Classify and dedupe**: role by usage (`roles.py`), ΔE dedupe (`colour.py`), palette build (`palette.py`, `site_palette.py`, `palette_refs.py`), typography (`typography.py`, `heading_weight.py`, `font_weights.py`, `used_fonts.py`), layout (`used_layout.py`, `declared_layout.py`), buttons and presets (`presets.py`).
4. **Derive (Pass B, advisory)** (`derive.py`) only for what Pass A could not find.
5. **Reconcile** declared against rendered (`declared_reconcile.py`): the rendered value wins; the divergence is logged.
6. **Validate and write** (`schema_validate.py`, `extract.py`): schema-check the snapshot against `theme.json` v3, write it and `theme-extract-trace.json`.
7. **Deploy** with `plugins/sgs-blocks/scripts/push-theme-snapshot.py` (§14.4): `--dry-run` diff, human go/no-go, then `--yes`.
8. **Business data** with `plugins/sgs-blocks/scripts/sync-business-info.py` (FR-33-14).

```
python plugins/sgs-blocks/scripts/theme-extractor/extract.py --client <slug> --draft <draft.html> [--facts f.json] [--out p] [--trace p] [--merge-onto existing.json] [--replace-source]
python plugins/sgs-blocks/scripts/push-theme-snapshot.py --client <slug> --target <ssh-host> --target-domain <host> --no-push
python plugins/sgs-blocks/scripts/sync-business-info.py --draft <draft.html> --target-domain <host> [--push]
cd plugins/sgs-blocks/scripts/theme-extractor && python -m pytest tests
```

All scripts sit under `plugins/sgs-blocks/scripts/theme-extractor/` except `push-theme-snapshot.py`, `derive-dark-palette.py`, `sync-business-info.py` and the `business_info/` package, which sit beside it under `plugins/sgs-blocks/scripts/`. `tests/` holds the unit, golden, determinism and real-browser tests; `expected/` holds the golden snapshots.

### 15.3 Requirements

#### FR-33-1 — Provenance-tiered extraction; the COMPUTED value wins (BUILT)
Every emitted token carries a `_source` provenance (`declared`, `derived` or `rendered`). The emitted value is the computed value read on a representative rendered node. Where a declared value and the computed value disagree beyond ΔE≤1 (or a length delta), the computed value wins and the divergence goes to the reconciliation log. A `:root` token that is declared but has zero computed usage (a dead token) is gap-logged, not emitted.
*Done when:* a fixture where `:root{--primary:#c00}` but the rendered CTA computes `#b00` emits `#b00` and logs the delta; a declared-but-unused token is gap-logged, not in the palette; every emitted token has a `_source`.

#### FR-33-2 — Role by usage context, with ΔE dedupe fully specified (BUILT)
Role is inferred by a priority-ordered rule table keyed on (CSS property × selector role × within-role frequency), never by token name or cross-role frequency:

| Signal | Candidate role |
|---|---|
| `background`/`background-color` on `body`/`html`/`:root`/`*` (a base selector) | `surface` |
| `background`/`background-color` on a content selector (a card, panel or section, not the base) | `surface-alt`, deliberately low-confidence (0.70, below the 0.85 identity-claim floor) so it never overwrites a client's own named draft token |
| `color` on body text, `p` or base, low L* | `text` / `text-muted` |
| high-chroma value on `.btn`, `.cta`, `a`, `a:hover` background | `primary` / `accent` |
| `border-color` or thin-border usage | `border-subtle` |
| value on a `.success`, `.error` or status selector | `success` / `error` |
| no confident (≥ threshold) role match | raw-hex `custom-<name>`; never force a slug |

Each mapping carries a confidence score; below the floor it becomes `custom` (conservation, FR-33-9). Colours dedupe at ΔE≤1; alpha is a separate axis (`rgba(x,1)` and `rgba(x,0.1)` do not dedupe); on a merge the `declared` token beats `derived`, among equals the first source order wins, and the loser's name is logged as an alias. **`surface-alt` fallback:** if no draft evidence or name tiebreak claimed `surface-alt`, `plugins/sgs-blocks/scripts/theme-extractor/palette.py::_synthesise_surface_alt` (after both assignment passes) derives one from the resolved `surface`, tinted 6% toward black (light surface) or white (dark surface), tagged `_source: "derived"`. The content-background signal stays at 0.70 because raising it would silently rename a client's own named large-surface token to the generic slug.
*Done when:* role-named, literal-colour-named and dogfood token sets each map to the right roles by the table, not by name; `success=#2E7D4F` lands as `success` whether named `--success` or `--green`; a colour used as both border and heading resolves by the higher-priority property or falls to `custom` with a logged ambiguity.

#### FR-33-3 — Base typography from COMPUTED nodes (BUILT)
The theme base (`styles.typography`, `styles.color`) is the computed font-family, size, line-height, colour and background read on a representative rendered `<p>` in the main content flow (the cascade of `html`, `body` and any content wrapper), not the `body{}` selector's declared value. `rem` resolves against the draft's computed `documentElement` font-size. Families: `body` from the base rule, `heading` from `h1` then `h2` then `h3`, `display` from an explicit `--font-display` token or the heading family, else omitted (never synthesised from nothing). The full fallback stack is emitted, and the primary family must actually load (deploy its `@font-face` or Google Fonts link). A value the draft never declared is never synthesised.
*Done when:* a re-clone renders body text at the draft base size and heading line-height from the draft; a `html{font-size:62.5%}` fixture resolves rem correctly; the heading font loads.

#### FR-33-4 — Complete DECLARED value-type coverage (BUILT)
Pass A extracts every declared value type into its slot (§14.2): colour palette (FR-33-2); typography families, sizes, weights, line-heights, letter-spacing (`fontFamilies`, `fontSizes`, `styles.elements.*`); spacing to `settings.spacing.spacingSizes`; radius to `settings.custom.borderRadius`; shadow to `settings.shadow.presets`; buttons to `settings.custom.buttonPresets.{primary,secondary,outline}` plus an optional `buttonPresets.default` entry (the site-wide button hover: `hover-transform`, for example `matrix(1, 0, 0, 1, 0, -3)`, and `hover-transition`, for example `0.25s`; printed as `--wp--custom--button-presets--default--hover-transform` and `--hover-transition`; every button style and block's buttons fall back to it, an absent value means no lift and the 0.18s fade, a style or block that sets its own hover transform or a per-instance lift or scale wins, and the `link` button style never lifts). `contentSize` and `wideSize` come from `.container`/`.section` `max-width` or a `--content-width`/`--measure` token (scanned beyond `:root`), superseded by the rendered content box when the census has one (FR-33-19). A `clamp()`, `calc()` or `min()` value is emitted verbatim. Button presets are an OPEN property bag: the diff between rest-state and `:hover` declarations, verbatim, so a hover that changes colour and transform is captured whole; `!important` is stripped and the value kept.
*Done when:* spacing tokens, a container content size, a button `border-radius` and both hover shapes (colour invert, transform lift) each land in the right slot with no `!important`; a declared `clamp()` size is emitted verbatim.

#### FR-33-5 — Pass B derivation is PROVISIONAL and advisory; token-less gives baseline plus skip (BUILT)
For values the draft does not declare, Pass B may derive them (usage-context role clustering per FR-33-2, computed-value read) but tags the output `_source: derived` with a confidence score, marks palette entries `advisory`, and never pushes them to the live `wp_global_styles` without explicit confirmation (`push-theme-snapshot.py::apply_advisory_policy` gates them; `--include-advisory` deploys them). Promotion uses a relative share within a role bucket, not an absolute count (authoring density varies); a token-less scrape is validation data, not calibration. A draft where both passes recover nothing usable emits the framework baseline unchanged plus a loud logged skip: never a silent guessed theme, never a partial deploy. A parser failure or malformed CSS halts with a clear error. Pass B counts only resting selectors (`roles.py::_SEL_NON_RESTING`: scrollbar, selection, placeholder, marker, hover, focus, active, visited never vote). Pass B overlays the base palette in place: an advisory entry for a base slug carries `_baseline_color`, so a push restores the base hex rather than deleting it, and a guessed palette can never leave a live site with fewer slugs than the framework.
*Done when:* a token-less synthetic draft's derived palette is `advisory` and does not deploy live without confirmation; a draft with nothing usable emits the baseline and a logged skip; Pass B never inverts a palette.

#### FR-33-6 — Dark-theme and preview-shell safety (BUILT)
The theme background is the computed background of the widest block-level ancestor that contains the main content flow, not `<body>` blindly. A dark `<body>` is never discarded by darkness alone: a preview shell is identified only by a positive structural signal (a `.viewport-switcher`, `.device-frame` or known review-harness DOM class or marker). An ambiguous signal gap-logs the background for one-glance confirmation, never a silent drop. This FR governs which background counts as `surface`; whether a distinct `surface-alt` is derived is FR-33-2's alone.
*Done when:* a dark review-harness shell is ignored via the positive signal; a legitimate dark-theme draft with no harness wrapper keeps its dark background.

#### FR-33-7 — Provenance trace, golden fixtures and schema validation (BUILT; one golden stale)
The extractor emits `theme-extract-trace.json`: one row per emitted token (`_source` pass, source selector and property, role-inference reason, ΔE-snap target and distance, confidence). "Correct" is a diff against a checked-in `plugins/sgs-blocks/scripts/theme-extractor/expected/<draft>.snapshot.json` golden per corpus draft, not an adjective. The snapshot is validated against the `theme.json` v3 schema (`schema_validate.py`) before handoff, so a malformed emit fails here, not at the REST push.
*Done when:* every corpus draft produces a trace explaining each token's origin and is diffed against its golden; a deliberately malformed emit is caught pre-deploy.
*Status:* the Mama's golden (`expected/mamas-munches.snapshot.json`) is stale against the current output, which writes the link focus state as `:focus-visible` where the golden has `:focus`; `python -m pytest tests` from `plugins/sgs-blocks/scripts/theme-extractor/` fails three golden-comparison tests on that single difference. Regenerate the golden once Bean confirms `:focus-visible` is the intended output.

#### FR-33-8 — Determinism and idempotence (BUILT)
Re-running on an unchanged draft produces a byte-identical snapshot. All clustering, promotion and dedupe use a total deterministic order (frequency within role descending, first-appearance byte offset ascending, canonical hex ascending; the ΔE-cluster canonical is the lowest first offset). Without this, git diffs and the FR-33-11 diff-approve review are meaningless.
*Done when:* two runs on an unchanged draft are byte-identical (a hard test: `tests/test_extractor.py::test_determinism_byte_identical`).

#### FR-33-9 — Conservation: extract to a slot or gap-log; no silent drops (BUILT)
Every global declaration is extracted to a slot or logged as a gap candidate. Intra-palette ΔE merges log the loser as an alias (FR-33-2). Role-bearing named colours go to the palette; sub-threshold decorative one-offs (a shadow rgba used once) go to the trace, not the client's colour picker. Dead `:root` tokens go to the gap log (FR-33-1).
*Done when:* every draft `:root` and base declaration appears in the snapshot or the gap log; a once-used decorative rgba is in the trace, not the palette; a grep finds no client literal.

#### FR-33-10 — Reuse by composition, not by widening a live helper (BUILT)
The extractor owns a new `plugins/sgs-blocks/scripts/theme-extractor/token_map.py::build_draft_root_token_map` (hex, non-hex and `var()`-chain resolution, fallback handling). The older hex-only `converter/services/styling_helpers.py::build_draft_root_colour_map` stays byte-identical, and a golden (`expected/mamas-hex-colour-map.json`) asserts its output is unchanged.
*Done when:* the older map's output is byte-identical for the golden draft and the extractor consumes the new composed map.

#### FR-33-11 — Deploy safety: backup, rollback, diff-approve, drift detection (BUILT)
No snapshot-only push of a regenerated palette goes to a client whose pages are not re-cloned in the same change; each client push is `--dry-run` diff, human go/no-go, then `--yes` (`SAFE_TARGETS` enforced). Before every `wp_global_styles` push the pusher fetches and backs up the current live payload to a timestamped file and documents a one-command `--rollback`. Before overwrite it diffs the live payload against the last-deployed snapshot and warns if the live layer was hand-edited in the Site Editor since. `drift_warning()` is a VALUE-level diff and reports both orphaned keys and clobbered keys (live versus incoming value), because a key-set diff would miss a changed value on an existing key (the commonest edit). A failed live fetch is loud; a failed backup aborts the push (`--force-no-backup` overrides; a genuinely fresh target still proceeds; `backup_gate` decides). Stripping an advisory palette entry (`apply_advisory_policy`) restores its base colour (`_baseline_color`, or the framework `theme.json` value when none was saved) and deletes only a slug the framework lacks, so no push can empty the palette. The REST write replaces `settings` wholesale, so the push carries over every Font Library family active in the live layer that the snapshot does not define (`keep_font_library_families`); without that, each push deactivated the site's installed fonts. A site with a `theme.json` but no `wp_global_styles` post is a fresh site: nothing to back up in that layer, the push proceeds and exits 0. A failed read of either layer (network or SSH error) is not a fresh site and aborts unless `--force-no-backup` is given. REST credentials come from the `.claude/secrets/*.env` file whose `WP_URL_*` host matches the target.
*Done when:* a regenerated snapshot passes the FR-33-3 re-clone and Bean's eye before any other client; `--rollback` restores the prior live payload; a hand-edited live layer triggers a warning pre-push.

#### FR-33-12 — Freshness keys and bootstrap ordering (PARTLY BUILT)
The extractor must run and validate for the current draft before any cloning for that client, because the cloning route snaps values to this snapshot (R-47-7). The snapshot records the keys that prove freshness:
- `_sgsExtractor.draft_css_sha256` hashes only the draft's `<style>` blocks, which cannot see a Claude Design draft change: such a draft keeps its design in inline `style` and `style-hover` attributes, its script and a README beside it.
- For that kind of draft the snapshot also embeds `_sgsExtractor.draft_source_sha256` (`plugins/sgs-blocks/scripts/shared_utils.py::draft_source_sha256`): a hash of the style blocks, every inline and hover style value, the script and the README, with line endings normalised. Static drafts carry no second key.
- `_sgsExtractor.source_draft` records the file the extractor ran on. The extractor runs on a client's source draft only: `shared_utils.py::is_part_draft` is true when a snapshot records a source draft and the draft passed is a different file, and `extract.py` refuses to overwrite a snapshot recorded from a different draft unless `--replace-source` is given. A snapshot with no recorded source is checked against every draft.

*Status.* The keys are written and the `--replace-source` refusal is built. The fail-closed freshness gate that reads them (`plugins/sgs-blocks/scripts/sgs-clone-orchestrator.py::_freshness_gate`) belongs to the old orchestrator. The computed route (`scripts/computed-route/lib/normalise.mjs`) loads the snapshot without checking freshness, so a freshness check in the route is not built.
*Done when:* a clone run with a stale or absent generated snapshot fails closed with a clear message; a run after a fresh extraction proceeds.

#### FR-33-13 — Namespace reservation and the token-map service (BUILT)
- **Acyclicity.** The extractor owns the declared `settings.*` tokens (written once per draft). Nothing downstream writes back into the snapshot's palette: the cloning route reads the snapshot and snaps to it (R-47-7), so there is no snapshot-to-clone-to-snapshot oscillation.
- **Header and footer namespace reserved.** The extractor owns global/base tokens and generic presets only. Header and footer component tokens (sticky or scrolled header background, header height, logo max-height, nav-link hover, burger breakpoint) belong to the header/footer blocks, in the reserved empty `settings.custom.header` and `.footer` namespace (`extract.py` reserves it). Those blocks' global defaults (colour, typography, spacing) come from the snapshot's palette, typography and spacing slots through the global-styles consumption every block already gets; their header-specific settings are scoped CSS and block attributes (Spec 37 FR-37-15 and FR-37-16).
- `build_draft_root_token_map()` (FR-33-10) is a callable service: nothing else re-parses `:root`.

*Done when:* the snapshot reserves the header and footer namespace and the token map is a callable service.

#### FR-33-14 — Business-data auto-fill companion (Tier 1 BUILT; Tier 2 and binding insertion NOT BUILT)
Alongside the global-styles extraction, the site's business DATA (the `Sgs_Site_Info` store: email, phone, socials, copyright, address, hours) is filled from the draft, so a cloned site's header and footer render real contact details with no re-entry. Run `plugins/sgs-blocks/scripts/sync-business-info.py` (a thin wrapper over the `plugins/sgs-blocks/scripts/business_info/` package). It is non-fatal by design: business data is nice to have, and a failure never blocks a deploy.

**Tier boundary (the trust line, mirroring FR-33-1's declared-versus-derived split).**
- **Tier 1 (BUILT, auto-applied):** only high-confidence machine-signal fields: email (`mailto:`), phone (`tel:`), socials (an `<a href>` to a known social domain; `#` placeholders skipped), copyright (the `©` line), and any address or hours the draft DECLARES (in its data object or beside an explicit label). Written fill-if-empty, never overwriting an operator's value. A Claude Design draft adds two sources: the script's runtime data object (keys such as phone, address, Instagram, Google link, matched through a vocabulary table) and labelled page text (an element reading Phone, Email, Address or Hours followed by its value). Values are validated by shape: a value containing a template binding is never stored, a social link needs an http or https scheme on a known host, and an hours range (`Mon–Sat 9.30–17.30`) expands to per-day keys. Labels inside a form, dialog, review summary or modal are ignored. Precedence: script data object, then labelled text, then literal links.
- **Tier 2 (NOT BUILT, review-not-auto-write):** free-text guesses (a tagline, or an address or hours found by guessing rather than by a declaration) are not auto-written; they need an operator-confirm flow, parallel to FR-33-5's advisory Pass B.

**Write channel.** The capability-gated `POST /wp-json/sgs/v1/site-info` (`plugins/sgs-blocks/includes/class-sgs-site-info-rest.php`, `edit_theme_options`), key-allowlisted to `Sgs_Site_Info::known_keys()` and sanitised per key through `Sgs_Site_Info::set()`, fill-if-empty by default. Dispositions: written, unchanged, skipped_existing, skipped_invalid, skipped_empty, failed. It is the only remote write path into the Site Info store (reads stay server-side and escaped), consumed by the `sgs/business-info` block and `Org_Website_Schema` (`sameAs`, `contactPoint`). Phone is stored as the display form (`0121 729 8233`); `Sgs_Site_Info_Binding::prefix_url_for_key` strips everything but digits and a leading `+` for the `tel:` link.

**Target and credentials.** The site is the one named by `SGS_DEPLOY_SITE` (host from that site's `WP_URL_*`; the canary is the default only when no site is named); credentials come from the matching secrets file. The pipeline never sends `overwrite`.

**Placeholder map.** `--map-out` writes `sites/<client>/site-info-placeholder-map.json`, mapping each template binding that resolves to a saved setting (`{{ phone }}` to `phone` as text, `{{ phoneHref }}` to `phone` as a `tel:` link). Replacing the bindings in a cloned page with the saved values is NOT built.

**Wiring.** The automatic run at deploy was wired through the old orchestrator (`plugins/sgs-blocks/scripts/orchestrator/upload_and_patch.py`, behind `--client` and `--push-theme-snapshot`). The computed route does not call it, so run the script directly after extraction.
**Depends on:** FR-33-11 (push moment and credentials), Spec 37 FR-37-10 and FR-37-11 (the `sgs/business-info` consumer), Spec 36 (the Site Info store).
*Done when:* a draft's email and copyright land in the store, socials that are `#` placeholders are skipped, an existing value is skipped, and a map link with no Site Info key is reported as unmapped.

#### FR-33-15 — Declared design outside `<style>` (Claude Design drafts) (BUILT)
A Claude Design draft declares its design system in three places: a README token table beside the draft, the script (accent sets chosen by a `data-props` enum, and a runtime data object) and inline `style` and `style-hover` attributes. FR-33-15 reads all three, cross-checks against the rendered page, and builds the snapshot from them. It is additive: it runs only when Pass A found no palette AND the draft has a readable README colour table or a variant set (`extract.py::_declared_design`). Every other draft takes the earlier path unchanged.
- README (`declared_sources.py::read_readme_tokens`): a colour table is any table containing hex colours, whatever its column wording; role words come from the row's other cells. A table that cannot be read, and any row without a hex, is gap-logged (FR-33-9), never dropped silently.
- Variant sets (`variant_sets.py`): an enum prop in `data-props` plus a script object keyed by its options. Inner key names are matched through a data table; an option counts if it maps an accent role. The rendered custom property (`facts["customProps"]`) says which option is active; when no rendered value confirms it, the accent entries are advisory.
- Usage (`usage_census.py`, `usage_js.py`): colours are counted in inline styles, hover styles, style blocks and JS values that flow into a style attribute through a template binding. Content data (product swatches, reviewer colours) is not styling and is not counted. A declared colour is promoted when used in a family its role allows; an undeclared one only with at least 25 uses and 90% in one family.
- The rendered value wins (FR-33-1): `surface` and `text` are checked against the rendered body (`declared_reconcile.py`); `primary` and `primary-text` come from the measured primary button, not from a README word (`presets.py`, `measure.js`).
- A row's Use text can fill a second slot (`palette_vocab.py::EXTRA_SLUG_TABLE`): a row naming a background and the footer also fills `footer-bg`, and a row named "Footer background" fills it directly. The usage check stays a guard on the phrase table: a row such as "Card border" matches the surface phrase by its wording alone, and only the usage count (border, not background) stops it taking a background slot.
- A role the phrase table cannot place gets an ADVISORY proposal from usage rank (`usage_roles.py`), never a firm entry.
- Vocabulary (role words, column words, variant key names) lives in data tables (`palette_vocab.py`, `declared_sources.py`, `variant_sets.py`). Extending one is a one-line change; a role missing from every table is proposed from usage or logged, not lost.

*Done when:* every palette custom property on a live page equals the snapshot at 1440px and 375px; no element paints the framework's old colours; a README with different column and role wording yields a usable overlay; snapshots of drafts that declare their design in `<style>` are byte-identical to before.

#### FR-33-16 — Site palette overlay (BUILT)
The palette is the base SGS palette (base order), overridden in place by declared and validated colours, plus a role-named addition only where no base slug fits (`text-label`, the small-label grey). It is never replaced or emptied, and it is generated once per site from the whole draft, never per page clone. Not palette: placeholder-tier README roles (faint, placeholder, disabled), third-party widget colours, and colours that drift between elements; they stay literal hex on the blocks that use them. Alternative accent sets are saved under `settings.custom.accentSets` (CSS variables, not picker swatches); the active set fills `accent`, `accent-text` and `accent-light`. `primary-dark` is derived from the final `primary`. Global defaults only: corner radius (square `0`, or an explicit pixel value into `borderRadius.medium`), `contentSize` and `wideSize` (wide never narrower than content), the measured heading weight (`heading_weight.py`), and button presets from measured buttons, including buttons that carry only runtime-generated classes (`GENERATED_CLASS_RE` in `measure-node.js`). `text-label` is a slug no framework block reads; it serves the cloning route's colour snap and the colour picker.
*Done when:* the snapshot has every base slug plus `text-label` only; none of the placeholder or drifting greys appears; nothing per element appears.

#### FR-33-17 — Variable-font faces (BUILT)
A self-hosted variable font declares a weight RANGE and uses the latin subset (`font_weights.py`). The weight probe tries `100..900`, then the range the draft's own font link requests, then `400..900`, then `300..700`; the family is static only if all are refused. The draft's font link is parsed as a URL, so multi-word family names match. An already-bundled face is untouched.
*Done when:* a variable font loads with its real weight range and the heading renders at the draft's weight.

#### FR-33-18 — Every loaded-and-rendered font family is captured (BUILT)
The three role slots (`body`, `heading`, `display`) say which family sets the body text and the headings; they cannot say which families the design needs on the site. `measure.js` runs a font census (`plugins/sgs-blocks/scripts/theme-extractor/font-usage.js::FONT_USAGE_SRC`): for every rendered element that paints its own text, the computed font-family stack, weight and style, plus `document.fonts` with each face's load status. `used_fonts.py::add_rendered_families` adds one `settings.typography.fontFamilies[]` entry per family that passes BOTH tests:
1. **Loaded.** A Google Fonts CSS `<link>` or `@import` names it (host checked exactly: `fonts.googleapis.com`), or a draft `@font-face` rule declares it.
2. **Rendered.** A census row's stack resolves to it: it is the first loaded name in that stack and no generic family (`serif`, `system-ui`...) comes before it.

Each entry carries `slug`, `name`, `fontFamily` (the stack the draft writes, most-used when several), `fontWeights` and `fontStyles` (only those rendered), `google: true|false` and `_source: "rendered"`. It gets a `fontFace` only when no other entry already loads that family, through the same self-host path the role slots use (`extract.py::_resolve_family_face`). The role slots are never changed. A family that renders but is neither a Google font nor bundled is logged as a gap and not added, because no file stands behind the name. Facts from an older `measure.js` with no census log a gap and add nothing.

**Runtime companion (plugin).** `Google_Fonts_Self_Host` (`plugins/sgs-blocks/includes/class-google-fonts-self-host.php`) reads `google: true` entries at render time. If an entry's family has no face served from the site, it downloads the recorded weights and styles server-side into `wp-content/uploads/fonts/sgs-google/<slug>/` (WP-Cron or `wp sgs google-fonts sync`), injects local `fontFace` entries and strips any remote `src`, so visitors never contact Google. It does nothing when the extractor has already self-hosted the family.
*Done when:* the census and `document.fonts` agree with the snapshot's entries and weights; a family loaded but never rendered, one rendered but never loaded, and one listed after a generic are not added; removing a family's census rows removes its entry. Tests: `tests/test_used_fonts.py`.

#### FR-33-19 — Content width and wide width come from the rendered layout (BUILT)
A client's content and wide widths are per-site settings (`settings.layout.contentSize` and `wideSize`). A declared `.container` max-width is usually the PADDED box, so writing it as `contentSize` made every normal-width container wider than the draft by its side padding.

**How the value is applied.** `SGS_Container_Wrapper` resolves `contentWidth: "normal"` to `var(--wp--style--global--content-size)` and `"wide"` to `var(--wp--style--global--wide-size)`, as the `max-width` of `.sgs-container__inner` with `margin-inline:auto`, under `box-sizing:border-box`; the section's side padding sits on the OUTER element and the inner band has no padding by default. So `contentSize` must equal the draft's CONTENT box (inside padding and border). The rendered content box of a clone is then `min(viewport − outer side padding, contentSize)`, centred, which equals the draft's content box both where the draft's cap binds and where the viewport is narrower.

**Behaviour.** `measure.js` runs a census (`plugins/sgs-blocks/scripts/theme-extractor/layout-census.js::LAYOUT_CENSUS_SRC`) at 1440 and 1920. A band is a top-level row of the page: the in-flow children of the first element below `<body>` with more than one, with `<main>` expanded. For every rendered text in a band inside the viewport it records the chain of elements above it whose computed max-width is in pixels, with each one's box model and measured content box. `used_layout.py::derive` then decides at the widest viewport:
1. A text's cap is the nearest element on its chain that does not paint text itself (a `ch` measure on a heading is a reading measure), is BINDING (its box equals its max-width, so neither the viewport nor an ancestor set the width), and has a content box of at least 600px (`FLOOR_PX`; the narrowest WordPress core theme `contentSize` is 620px, so anything narrower is a card or a form).
2. A band is constrained only when every text in it has such a cap; its width is the widest of them. A band with any uncapped text is full width and does not vote. Header, footer and nav bands are recorded but do not vote (Spec 37 owns them).
3. `contentSize` is the most common band width (a tie goes to the narrower). `wideSize` is the most common width wider than it that at least two bands use. With no such width, `wideSize` is not derived: the existing value stays, raised to `contentSize` if narrower.
4. No constrained band: nothing is written and the trace says so. A value is never invented.

The rendered value wins over the declared `.container` width (FR-33-4) and the README width (FR-33-16), per FR-33-1; the trace row records the superseded values, the tally, and per band the cap element, its max-width, box-sizing, padding and content box at both viewports. Facts from an older `measure.js` carry no census: a gap row is logged and nothing changes. `python used_layout.py --facts <facts.json> --snapshot <snapshot> --write` updates only `settings.layout` of an existing snapshot.
*Known limit:* only the screen that renders on load is measured. A multi-screen Claude Design draft switches screens in its script; a screen with a different `main` width needs a literal `contentWidth` on its containers, because the site has no third width slot.
*Done when:* the derived `contentSize` equals the draft's content box at 1440 and 1920 for its constrained bands. Tests: `tests/test_used_layout.py`, including a real-browser run on fixture drafts (two widths, no max-width at all, a max-width only on a card), with a mutation run confirming each rule (floor, text-element skip, binding, chrome, uncapped row, two-band wide minimum, most-common) is caught by a failing test.

#### FR-33-20 — Automatic dark palette from the client's own colours (BUILT)
A client opts in with a top-level `_sgsDark` key in its `theme-snapshot.json`: `{ "enabled": true, "palette": { "<slug>": "#hex" }, "roles": { "<slug>": "surface|text|border|brand|locked" } }`. It is internal (removed before deploy, §14.1). `plugins/sgs-blocks/scripts/derive-dark-palette.py::derive` runs inside `push-theme-snapshot.py::prepare_deploy_snapshot`, the one function both the snapshot push and `build-deploy.py` use, and writes `settings.custom.dark.<slug>` for every palette slug (WordPress prints `--wp--custom--dark--<slug>`). The theme maps each `--wp--preset--color--<slug>` to it while dark mode is on and loads dark mode only when the client has a dark palette.

**Rules.** Each slug's role comes from its name unless `roles` sets it. Light surfaces move onto a dark band (hue kept); surfaces already dark in light mode keep their value. Every other colour follows the minimum-change rule: it is kept byte-identical if it already reaches its target against every ground it is used on (4.5:1 text, 3:1 borders and brand), otherwise its OKLCH lightness moves the shortest distance that passes them all. Grounds are every surface plus the text/background pairs the snapshot declares (`styles.color`, `styles.elements` with states, `styles.blocks`, preset references in template parts). Locked colours (WhatsApp green) are checked, never changed; hand-set `palette` values win and are checked the same way. A text slug paired with a fill only by its NAME (`text-inverse` with `primary`, `<fill>-text` with `<fill>`) is checked against that fill only when the pair already reads in light mode; otherwise it is a light-mode warning in the push note (`derive-dark-palette.py::_guessed_fill`). **Fill-scoped ink:** a text colour declared on a fill that stays light in dark mode, inside one style scope (a theme.json element such as the button, a block, or a markup `has-<fill>-background-color` element), keeps its own value in that scope only: the light-mode value when it still reaches 4.5:1 on the fill's dark value, else the shortest lightness move that does. It ships as `settings.custom.darkInk.<kind>.<name>.<state>.<slug>` and `theme/sgs-theme/functions.php::dark_mode_ink_css` prints it (both theme reads go through `functions.php::global_custom_setting`: core returns the whole settings array for a missing `custom` path, which once loaded dark mode on every site without a palette) as `--wp--preset--color--<slug>` on that scope's selector (element selectors from `WP_Theme_JSON::ELEMENTS`, block selectors from `wp_get_block_css_selector()`), so page text inverts while a bright button keeps a readable label. When no value satisfies every ground, the push stops and names each pair and ratio (`DarkPaletteContrastError`), so a client never ships an unreadable dark page; a hand-set `palette` or `roles` entry settles the conflict.
*Status:* a client that opts in with no hand-set colours derives with no failures; light-mode warnings are reported in the push note, not hidden. Tests: `plugins/sgs-blocks/scripts/tests/test_derive_dark_palette.py`, `test_push_theme_snapshot.py`, `plugins/sgs-blocks/tests/php/run-dark-mode-ink-standalone.php`.

### 15.4 Known limits

- The primary button's hover text is the framework's `#ffffff`, not the draft's off-white: the hover diff omits keys equal to the rest state and the merge keeps the framework value.
- A README and the script can disagree; the script is what renders and wins. A README value is cross-checked against the render only for `surface`, `text` and `primary`.
- Vocabulary is data but finite. A role no table names is proposed from usage (advisory) or logged.
