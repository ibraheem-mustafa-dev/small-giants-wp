# Multi-layer shadow editor: GitHub research seat (4f)

Method: `gh repo view`, `gh api` trees, source decoded from base64. Snapshot 2026-09-21.

## Headline finding

No mature open-source multi-layer box-shadow editor exists. `gh search repos` for "box-shadow generator", "shadow editor" and topic tags returned only toys (0 to 60 stars, or stale/archived). The proven material is in design-system token files and three real implementations below. brumm/smooth-shadows is not a public GitHub repo (`gh repo view` fails); Josh Comeau's site source is not public. Excluded as stale: tom2strobl/smooth-shadow (last push 2022), alexwidua/figma-beautiful-shadows (2023), madeas/box-shadows.css (archived).

## Ranked repos

| # | Repo | Stars | Last push | Licence | Why |
|---|---|---|---|---|---|
| 1 | https://github.com/WordPress/gutenberg | 11,755 | 2026-09-21 | GPL-2.0-or-later (API says NOASSERTION) | The only real multi-layer editor plus preset system. Same platform as us. |
| 2 | https://github.com/postcss/postcss-smooth-shadow | 37 | 2026-04-21 | MIT | Cleanest smooth-shadow algorithm, with per-layer alpha via relative colour. |
| 3 | https://github.com/argyleink/open-props | 5,521 | 2026-08-11 | MIT | Elevation scale driven by one colour and one strength knob; live playground. |
| 4 | https://github.com/ChromeDevTools/devtools-frontend | 4,048 | 2026-09-21 | BSD-3-Clause | Best keyboard and a11y model for a single-layer editor. |
| 5 | Radix Themes (radix-ui/themes, 8,718, 2026-04-11, MIT); Chakra (40,660, MIT); Mantine (31,746, MIT); Tailwind (97,630, MIT) | | | | Token scales only. No editor. |

## 1. Gutenberg

Files: `packages/global-styles-ui/src/shadow-utils.ts`, `shadows-edit-panel.tsx`, `shadows-panel.tsx`; `packages/block-editor/src/components/global-styles/shadow-panel-components.jsx`; `packages/style-engine/src/styles/shadow/index.ts`.

**Data model.** A stack is a plain CSS string; layers are not stored as objects.
- Preset: `theme.json` `settings.shadow.presets[]` = `{ name, slug, shadow: "<css string>" }` in three origins (`default`, `theme`, `custom`), plus `settings.shadow.defaultPresets: bool`.
- Block: attribute `style.shadow` (`type: string`); the style engine emits `boxShadow`.
- Layer, editor-side only (`ShadowObject`): `{ x, y, blur, spread, color, inset }`, all strings except `inset`.
- Colour and alpha live inside the string (`rgba(0, 0, 0, 0.2)`). The editor uses `ColorPalette` with `enableAlpha`.
- Seed default: `6px 6px 9px rgba(0, 0, 0, 0.2)`.

**Layer handling** (the whole mechanism is string split and join):
```ts
getShadowParts = (s) => (s.match(/(?:[^,(]|\([^)]*\))+/g) || []).map(v => v.trim());
onChangeShadowPart = (i, part) => { const p=[...parts]; p[i]=part; onChange(p.join(', ')); };
onAddShadowPart    = () => onChange([...parts, defaultShadow].join(', '));
onRemoveShadowPart = (i) => { onChange(parts.filter((_, j) => j !== i).join(', ')); addBtnRef.current?.focus(); };
```
- Add and remove exist. **Reorder and duplicate do not.** Layers are keyed by `key={index}`.
- Remove is hidden when only one layer is left (`canRemove`).
- After remove, focus returns to the Add button.
- Each layer is a row: a toggle button ("Drop shadow" or "Inner shadow") that opens a popover with colour+alpha, an Outset/Inset toggle group, and X/Y/Blur/Spread unit inputs. The `UnitControl` maxima are px 20, em 10.

**Preset picker a11y.** `Composite role="listbox"` of `Composite.Item role="option" aria-selected`, each with a tooltip and a check icon when active. The Clear button uses `accessibleWhenDisabled`. Presets are de-duplicated by slug, last origin wins (`findLastIndex`). An "Unset" entry is display-only and is never persisted. Custom presets get a slug `shadow-N`, with Rename, Delete and a Reset-to-base menu.

**Weaknesses I read in the code.**
- The `getShadowParts` regex only handles one paren level. It would split `color-mix(in oklab, red, blue)` or `var(--x, 1px)` wrongly (my reading of the regex, not run).
- `shadowStringToObject` rejects any layer containing `none` or a second colour, and falls back to a default, which silently discards the user's value.
- The colour regex accepts only hex, rgb and hsl, so oklch and var() tokens are lost.

## 2. postcss-smooth-shadow (`index.js::renderShadows`)

Input is one authored shadow (x, y, blur, colour, optional inset) plus a type (`sharp`, `soft`, `linear`). Output is 1 to 10 layers (about one per 6px of blur):
```js
let layers = Math.min(10, Math.ceil(toPx(blur) / 6));
const inc = 1 / layers;
const getAlpha = type==='sharp' ? i => 1 - i*inc : type==='soft' ? i => (i+1)*inc : () => 1;
for (let i = 0; i < layers; i++) {
  const step = +easeInQuad((i+1)/layers).toFixed(3);   // x*x
  const a = +getAlpha(i).toFixed(3);
  out.push(`${inset?'inset ':''}calc(${step} * ${x}) calc(${step} * ${y}) calc(${step} * ${blur}) ` +
           `rgb(from ${color} r g b / calc(alpha * ${a}))`);
}
```
- Every dimension scales by an eased step, so the stack is fully determined by three numbers and a colour. The relative colour preserves the author's own alpha and the colour format (oklch is fine).
- Weakness: it hard-codes 6px per layer and a 10-layer cap, and it emits relative-colour syntax, which needs a fallback on older browsers.

## 3. Open Props shadows (`src/props.shadows.css`, `docsite/js/shadow-playground.js`)

- Elevation is a token scale, `--shadow-1` to `--shadow-6`, of 1 to 7 layers. All colours come from a single triple `--shadow-color: 220 3% 15%` and alpha from `--shadow-strength: 1%`, with derived steps such as `--shadow-strength-4: calc(var(--shadow-strength) + 3%)`.
- Layer count and geometry are hard-coded per elevation. Only hue, saturation, lightness and strength vary. Layers are alpha-stepped (for example 3%, 3%, 5%, 6%, 8%), not uniform.
- A separate dark file re-tunes the strengths. The playground state is just `{hue, saturation, lightness, strength}` fed to `generateShadows(h,s,l,strength)`, so a client tunes one colour and one strength, not 30 numbers.

## 4. Chrome DevTools `CSSShadowEditor.ts`

- One layer per editor. Model interface: `offsetX/offsetY/blurRadius/spreadRadius: CSSLength` (`{amount, unit}`) plus `inset(): boolean`. Spread and inset are hidden when editing `text-shadow` (`isBoxShadow()`).
- Keyboard: a 2D `<canvas>` slider for x/y responds to arrow keys (1 step; `clamp` to ±maxRange). Text inputs use Up/Down value-nudging that preserves units. Blur is clamped to at least 0. Blur and spread also have `<input type=range>` sliders. Enter/Escape are tracked.
- Weakness: the canvas slider is a pointer-first control and needs its own focus/blur drawing.

## 5. Token-only references (data-shape comparison)

- **Radix Themes** (`styles/tokens/shadow.css`): six steps. Layer 1 is usually a 1px ring, `0 0 0 1px var(--gray-a3)`, then softer offsets. `--shadow-1` is fully inset. Alpha tokens (`--gray-a3`, `--black-a2`) carry the alpha, and a `@supports (color: color-mix(...))` block upgrades the ring.
- **Chakra** (`semantic-tokens/shadows.ts`): xs to 2xl plus inner. Two layers each (a drop and a 1px hairline). Separate `_light` and `_dark` values, and the dark hairline is `inset` at 20 to 30% alpha.
- **Mantine** (`default-theme.ts`): xs to xl, 2 to 3 layers, negative spread on the lower layers (`0 10px 15px -5px`).
- **Tailwind v4** (`theme.css`): 2xs to 2xl, 1 to 2 layers, hard-coded `rgb(0 0 0 / a)`. Separate inset, drop and text scales.

## What to copy

1. **Storage = ordered array of layer objects, serialised at the edge.** Gutenberg's string-splitting is its worst design point. Store `[{x,y,blur,spread,colour,alpha,inset}]`, and colour as a token slug or CSS colour plus a separate alpha. Serialise to a string only for CSS output, so parsing is never needed and nested-paren colours are safe. Give each layer a stable id, not `key={index}`, so reorder and duplicate work.
2. **Generator = three inputs and a colour.** Use the postcss-smooth-shadow loop (layer count from blur, eased step, linear/sharp/soft alpha curve) to build layers as ordinary editable layers. Once generated, the client edits them like any others.
3. **Elevation scale = one colour token plus one strength knob** (Open Props). Layers scale with the tokens, so a client rebrand moves every elevation at once. Keep separate light/dark tunings (Chakra, Open Props dark file).
4. **Ring-first pattern** for an elevation: a 1px hairline layer (Radix, Chakra) is a good default first layer.
5. **Preset plumbing** = Gutenberg's model: origins, slug dedupe with last wins, an "Unset" display-only entry, a Reset-to-base action, and rename/delete for custom presets.
6. **A11y:** `listbox`/`option`/`aria-selected` for presets, `accessibleWhenDisabled` for Clear, focus returned to Add after Remove (Gutenberg). Up/Down value-nudging that preserves the unit, and a 2D x/y control that has arrow-key handling (DevTools). Numeric inputs remain the primary control, so the canvas slider can be optional.

## What to avoid

- Gutenberg's regex parse of a string as the source of truth, its silent fallback to a default on unparsable input, and its lack of reorder and duplicate.
- Hard-coded `rgb(0 0 0 / a)` (Tailwind, Mantine): it blocks client brand tinting.
- Hard-coded per-elevation geometry in Open Props if we want the generator to output editable layers. Take its colour/strength model only.
- Relative-colour syntax (`rgb(from ...)`) as the only output without a plain-alpha fallback.
- Copying Gutenberg code verbatim: GPL is not permissive, so take ideas only, per our rule.

Licence check: MIT (postcss-smooth-shadow, Open Props, Radix, Chakra, Mantine, Tailwind) and BSD-3 (DevTools) are safe to borrow from. Gutenberg is idea-only.
