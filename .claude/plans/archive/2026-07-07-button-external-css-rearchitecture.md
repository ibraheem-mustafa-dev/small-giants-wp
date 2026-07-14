---
doc_type: phase-plan
title: Button block — external-CSS re-architecture (reference implementation for the framework-wide sweep)
status: ACTIVE
created: 2026-07-07
---

# Button external-CSS re-architecture

## Why (Bean, 2026-07-07)

The button (and "a huge amount of our blocks") emits block settings as **inline
`style=""` on the HTML element**. This is wrong:

1. **Hover is broken.** Inline styles (specificity 1,0,0,0) beat every stylesheet
   rule including `#uid.sgs-button:hover` (1,2,0). A primary button with inline
   `color`/`background`/`border` therefore has **zero** hover; secondary (empty bg,
   not inline) hovers only its background. Proven live 2026-07-07.
2. **Not reusable.** Baking brand colours into the block markup means the same
   block can't re-skin per client by changing `theme.json`.
3. **Not the WP way.** WP themes don't inline every hex/px/string set in the block
   editor — they apply it as external CSS. Inline hardcoding obstructs that.

## The correct model (APPROVED — Bean + the component-library pattern)

| Layer | Responsibility |
|---|---|
| **HTML** | Clean: `class="sgs-button sgs-button--{preset}"` + `id="{uid}"` for scoping. **No inline colour/geometry styles.** |
| **Block `style.css`** | Base `.sgs-button` + `.sgs-button--{primary,secondary,outline}` **+ `:hover`**, all colours as `var(--wp--preset--color--X)` theme tokens = sensible framework DEFAULTS (a freshly-inserted button looks right on any theme). Hover lives here → always works. |
| **Theme (`theme.json` / snapshot)** | **FOUNDATION (Option 1).** Per-client preset values live here. `push-theme-snapshot` GENERATES external CSS (`.sgs-button--primary{…}:hover{…}`) from the snapshot's `buttonPresets`, using theme tokens. Swap the theme → re-skin every button. |
| **Editor / per-instance override** | **Option 2, but STILL external CSS — never inline.** A custom value (editor-entered OR a genuine per-block draft exception) is emitted as a scoped `#uid.sgs-button{…}` / `#uid.sgs-button:hover{…}` rule in a `<style>` block. `#uid` outspecs the class default; hover override goes in `:hover`. HTML stays clean. |
| **Pipeline / converter** | Emits the clean class + **extracts the draft's real preset values ACCURATELY — base AND hover, including `primary-dark`** — into the client snapshot `buttonPresets`. No manual authoring, no asking Bean. Divergences → generated theme CSS or scoped `#uid` override (external). |

**Iron rule:** a block setting NEVER becomes an inline `style=""` value. Defaults =
class-based external CSS (theme tokens). Overrides = scoped `#uid` external CSS.
This is the standard for the later framework-wide sweep; the button is the reference.

## The 9 live defects this fixes (mamas homepage, 2026-07-07)

| # | Symptom | Root cause | Fixed by |
|---|---|---|---|
| 1 | Primary button no hover | inline colours beat `:hover` | external CSS (class + scoped) |
| 3 | Secondary hover only changes bg (text invisible) | text/border inline; bg empty | external CSS |
| 8 | Gift-card + hero primary buttons no hover | same as #1 | external CSS |
| 7 | Outline hover border wrong (should be `primary-dark`) | snapshot hand-authored `primary` (half-job) | pipeline extracts draft `:hover` accurately |
| 2 | Hero CTAs stack at 768 (draft stays row) | multi-button tablet direction/breakpoint | responsive audit |
| E2 | Button doesn't stretch to fill its space | width/fill (`--full` / align stretch) | button width fix |
| 4 | product-card trial CTA = primary (should be secondary) | converter doesn't detect per-card preset | product-card mirror (per-card preset detect) |
| 9 | "find out more" naked link forced to primary preset | naked link recognised as button + defaulted to `primary` (not `custom`) | recognition: naked styled link stays naked, no preset class |
| 5 | Option-picker pills restyled like a button | TBD — trace whether mine or pre-existing | investigate |

## Build order (button as reference)

1. **`style.css`** — base `.sgs-button` (structural, no colour) + `.sgs-button--{preset}` + `:hover` in theme tokens (framework defaults). Remove reliance on inline.
2. **`render.php`** — emit clean HTML (classes + uid); STOP emitting inline colour/geometry; emit a scoped `#uid` `<style>` ONLY for genuine per-instance overrides (external). Keep hover in `:hover`.
3. **`edit.js`** — editor sets the modifier class + emits overrides as scoped CSS (not inline); variations set the class.
4. **Converter** — emit `sgs-button--{preset}` class; extract the draft's preset CSS (base + hover, incl `primary-dark`) accurately into snapshot `buttonPresets`; naked styled links stay naked (no preset).
5. **`push-theme-snapshot`** — generate `.sgs-button--{preset}{…}:hover{…}` theme CSS from the snapshot `buttonPresets` (Option-1 foundation).
6. **Verify** live at 375/768/1440: clean HTML, hover works on every preset, faithful colours (incl primary-dark), button fill, no naked-link-forced-preset.
7. Then: product-card CTA mirror (#4), option-picker (#5), hero 768 stacking (#2).

## Guardrails
- Verify on the REAL homepage (Playwright live DOM + computed style), not emit alone.
- Pipeline collects values; do NOT hand-author the snapshot or ask Bean for colour values.
- No inline `style` for settings — audit the emitted HTML for a clean `style` attr.
