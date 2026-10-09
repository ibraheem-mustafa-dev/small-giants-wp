---
doc_type: spec
spec_id: 11
spec_version: "2.0"
title: SGS Button Architecture
project: small-giants-wp
status: shipped
last_verified: 2026-10-09
authors: Bean + Claude
---

# SGS Button Architecture

> **Styling model: read [Spec 32](32-COMPONENT-STYLING-TOKEN-CONTRACT.md).** A button paints through a semantic BEM variant class plus custom properties fed by per-client tokens. This spec holds the two-block pair, the composition pattern and the button-specific rulings. The attribute surface is `plugins/sgs-blocks/src/blocks/button/block.json` and the framework DB (`/wp-blocks schema sgs/button`, `python ~/.claude/skills/sgs-wp-engine/scripts/sgs-db.py block sgs/button`); never copy it into a doc.

**Implements:** `sgs/button` (the canonical button block) and `sgs/multi-button` (its container).
**Replaces:** every use of `core/button` inside SGS blocks, and the hand-coded CTA rendering that composite blocks (`sgs/hero`, `sgs/feature-grid`) once carried.

---

## 1. Purpose

One canonical button block and one flexible container replace every CTA implementation in the framework. The pair gives:

- **A full attribute surface** (content, per-device typography, padding and width, hover and focus states, icon, shadow, transition) matching or exceeding Spectra and Kadence. Read it from `block.json`.
- **Variant binding.** The site owner sets primary, secondary and outline styling once (as per-client tokens) and every button using that variant follows.
- **WordPress-native composition.** Composite blocks accept buttons through InnerBlocks rather than rendering CTAs internally, so button rendering has one source of truth.

## 2. Why not extend `core/button`

`core/button` has no per-breakpoint typography or padding, no hover-state attributes, no icon support, no link to site-level defaults, no `download`/`tagName`/`isSubmit` and limited transition and shadow controls. Extending it would mean maintaining a Gutenberg fork or fragile filter overrides, so the framework owns its button, as every serious page builder does.

## 3. The two-block pair

### `sgs/button` (atomic)

A single button. Dynamic block: `plugins/sgs-blocks/src/blocks/button/render.php` drives the output and `save` returns `null`. Rulings the schema cannot state:

- **`inheritStyle`** (`primary` | `secondary` | `outline` | `link` | `custom`) selects the BEM variant class `.sgs-button--{preset}`, which sets the six `--sgs-btn-*` custom properties from that client's `--wp--custom--button-presets--{preset}--*` tokens (`plugins/sgs-blocks/src/blocks/button/style.css`). A `custom` or unknown value emits no modifier. The editor emits the same class, so WordPress's native "Transform to variation" control (the primary, secondary and outline block variations declared in `block.json`) visibly applies in the canvas.
- **Presets seed, they do not lock.** Every button paints colour, border, hover, typography and shadow entirely from its own attributes; `inheritStyle` gates no styling. `plugins/sgs-blocks/src/blocks/button/presets.js` holds the seed values used by the built-in CTA "Apply preset" control of `sgs/product-card`, and `sgs/multi-button` offers a "Style preset" select that applies a preset to every child button at once (D283).
- **Built-in buttons reuse the same path.** `plugins/sgs-blocks/includes/helpers-button-style.php::sgs_button_element_style_css` gives any built-in button element (the bound CTA of `sgs/product-card` first) the same colour, border, radius, font, padding and width treatment from a prefixed attribute set.
- **Content and hover.** `contentAlign`, `iconGap`, `liftHover`, `note` and `textDecorationHover` are button-owned; their behaviour is described in `02-SGS-BLOCKS.md` (Button architecture). `note` is rendered by `plugins/sgs-blocks/includes/helpers-button-note.php::sgs_button_note_html`.
- **Per-device width** (`widthType`, `customWidth` and its unit are tier objects) renders in a uid-scoped `<style>` at the 768/1024 device tiers, so a button can be full width on mobile only (D280).
- **Full width** is `plugins/sgs-blocks/src/blocks/button/style.css::.sgs-button--full`: `width:100%; flex:0 0 auto; align-self:stretch`. It fills the line as a flex-row item and keeps its content height in a flex column; a percentage flex-basis is never used because in a column it resolves against the parent's height.
- **Label hardening (XS-9.2).** The label renders through `wp_kses` with an allowlist of `<br>`, `<strong>`, `<b>`, `<em>`, `<i>`, `<span class>` and `<code>`, which deliberately EXCLUDES `<a>`: the wrapper anchor is the block's own, and a nested anchor is invalid HTML and a phishing vector. The URL goes through `esc_url`, which blocks `javascript:`, `data:` and `vbscript:` schemes.

### `sgs/multi-button` (container)

Holds 0..N `sgs/button` instances through InnerBlocks, restricted to `sgs/button` children. It provides layout direction, alignment, wrap and gap per breakpoint (the gap is the shared `ContainerWrapperControls` gap control) and a default template of two buttons when first inserted. It mirrors how `core/buttons` wraps `core/button`, with the per-breakpoint controls the core pair lacks.

### Composition pattern in composite blocks

Every block that renders CTAs (`sgs/hero`, `sgs/feature-grid` and so on) exposes an `<InnerBlocks>` slot whose default template is `sgs/multi-button` holding two `sgs/button` instances. The user can delete one button (a one-CTA block), delete both (text and image only), add a third, and choose each button's variant independently. There is no "Match Style" extension: the variant lives once on `sgs/button` and every instance inherits it. New SGS blocks with CTAs MUST use this pattern; the one recorded exception, `sgs/product-card`, is described in `02-SGS-BLOCKS.md`.

A dynamic block with an InnerBlocks slot must `save` as `<InnerBlocks.Content />`, never `null`, or the nested blocks are lost on save (`.claude/specs/common-wp-styling-errors.md` B4).

## 4. Button presets are native theme.json

Per-client preset values live in `settings.custom.buttonPresets` of the client's `sites/<client>/theme-snapshot.json` (Spec 32 Part C), pushed by `plugins/sgs-blocks/scripts/push-theme-snapshot.py`, and in the Customiser panel `plugins/sgs-blocks/includes/class-button-presets-customiser.php`. WordPress generates the `--wp--custom--button-presets--*` properties itself; the framework emits no bridge and has no Settings page for them.

| Path | Audience | UX |
|---|---|---|
| Site Editor, Styles, Buttons | Site owners and power users | Native WordPress UI with live preview and pseudo-element support |
| `sites/<client>/theme-snapshot.json` | Developers shipping a client | Code-first, version-controlled, per-site push CLI |

Each preset (primary, secondary, outline) carries the full per-state set: background, text, border, border width, radius, padding, font size and weight, minimum height, and the `:hover` background, text and border.

## 5. Rulings

- **Decision 22:** button presets are native theme.json `settings.custom.buttonPresets` (plus the Customiser panel). There is no Settings page and no `wp_options` bridge (`sgs_button_presets` names only a Customiser panel). Bean-approved.
- **Decision 24:** WordPress natively generates every consumed `--wp--custom--button-presets--*` property from `theme.json` `settings.custom.buttonPresets`, so no PHP bridge exists. The coverage audit is `.claude/reports/phase-5b-button-property-coverage.md`.
- **D283:** the locked inline-preset system is removed; presets seed attributes and every value stays editable. Bean-approved.
- **D280:** per-device button width and the hover underline (`textDecorationHover`) are part of the surface.
- **D270, D271, D293:** no `deprecated.js` and no version bumps pre-production; an attribute change ships without a deprecation path (`.claude/rules/block-authoring.md`).

## 6. Gaps deliberately skipped

Visibility controls are not button-specific: the universal visibility extension (`02-SGS-BLOCKS.md`, Visibility Extension) covers them.
