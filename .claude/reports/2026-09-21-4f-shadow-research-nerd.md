# Multi-layer box-shadow: modelling and editing (The Nerd)

Sources were fetched and read in this session (page text, raw GitHub files). Anything marked DERIVED is my own curve-fit to published numbers, not a quoted formula.

## 1) Principles

1. **One light source, site-wide.** Pick one angle for every shadow, not one per element. Comeau: "decide on a single light source for all elements on the page", shadows share an angle because per-element angles are too much hassle. https://www.joshwcomeau.com/css/designing-shadows/
2. **Elevation moves four things together.** Offset up, blur up, opacity down (Comeau), and the y-offset stays a fixed multiple of x. Same page. Note the disagreement: Material Design Lite keeps alpha constant at 0.2 / 0.14 / 0.12 at every elevation and varies only geometry. https://raw.githubusercontent.com/google/material-design-lite/mdl-1.x/src/_variables.scss
3. **Layer, geometrically.** Each layer roughly doubles offset and blur (1,2,4,8,16px); alpha per layer falls as layers rise, about 0.6 divided by layer count. Ahlin: 4 layers at 0.15, 5 at 0.12, 6 at 0.11. https://tobiasahlin.com/blog/layered-smooth-box-shadows/
4. **Alpha slope is the sharpness control.** Ahlin's "sharp" is 0.25 down to 0.05 (innermost strongest); "diffuse" is 0.08 up to 0.20. Blur-to-offset ratio sets softness: 0.5 long/short, 1 default, 2 "dreamy". Same page.
5. **Key plus ambient.** Two-layer systems (Fluent 2) pair a tight key shadow with a small ambient one; Material adds a third (umbra, penumbra, ambient). https://raw.githubusercontent.com/microsoft/fluentui/master/packages/tokens/src/utils/shadows.ts
6. **Tint with the surface hue, never pure black.** Black desaturates the surface. Comeau's "just right" on hsl(220 100% 80%) was hsl(220 60% 50%): same hue, saturation about 0.6x, lightness far lower. His generator's tinted output on #F1CFFC used 286deg 36% 56%. https://www.joshwcomeau.com/shadow-palette/
7. **Few named tokens, one colour variable.** Open Props exposes `--shadow-color` and `--shadow-strength`; dark mode swaps them (`220 40% 2%`, strength 25% instead of 1%). https://raw.githubusercontent.com/argyleink/open-props/main/src/props.shadows.css
8. **Dark mode needs a hairline, not just more alpha.** Radix bakes a `0 0 0 1px` ring into shadows 2 to 6 and uses inset for shadow-1. https://raw.githubusercontent.com/radix-ui/themes/main/packages/radix-ui-themes/src/styles/tokens/shadow.css
9. **Paint cost scales with layers and is paid on every animated frame.** Comeau: 5 layers means about 5x the work; do not animate a layered shadow. Animate the opacity of a pre-painted `::after` instead (Ahlin). https://tobiasahlin.com/blog/how-to-animate-box-shadow/

## 2) Formulas and recipes

**Reference data (all verified).**

| System | Layers | Numbers |
|---|---|---|
| Tailwind v4 `shadow-lg` | 2 | `0 10px 15px -3px / .1, 0 4px 6px -4px / .1` (spread about -0.2 x blur) |
| Fluent `shadow16` | 2 | `0 0 2px ambient, 0 8px 16px key` (key blur = 2 x y; steps 2,4,8,16,28,64) |
| Material 8dp (MDL) | 3 | `0 8px 10px 1px .14, 0 3px 14px 2px .12, 0 5px 5px -3px .2` |
| Comeau palette, low / medium / high | 3 / 4 / 8 | final layer `1 2 2.5 -2.5`, `5 10 12.6 -2.5`, `25 50 62.9 -2.5` (x = y/2, blur = 1.25 x y) |
| Strobl `smooth-shadow` | up to 24 | 5 inputs; default light `[-0.35,-0.5]`; caps layers at 24 https://raw.githubusercontent.com/tom2strobl/smooth-shadow/main/src/index.ts |

Brumm's generator maths (`eaze`): alpha, offset and blur each eased by their own cubic-bezier across n layers. https://github.com/brumm/eaze

**DERIVED one-value-to-k-layers formula** (fitted to Comeau's high tier within about 10%, Ahlin and Material totals):

- Input: elevation step n = 1..6, so final offset Y = 2^(n-1) px (1,2,4,8,16,32).
- Layers: k = clamp(round(log2 Y) + 2, 2, 6). Drop any layer with y < 0.5px.
- For i = 1..k, t = i/k:
  - y_i = Y x t^2.5 (ease-in; Comeau's 8-layer y column fits exponents 2.3 to 2.9)
  - x_i = y_i x L (L = light ratio; see below)
  - blur_i = y_i x S (S softness, default 1.25)
  - spread_i = -0.15 x blur_i (range 0 to -0.2)
  - alpha_i = (O / k) x (1 + s x (1 - 2(i-1)/(k-1))); O total "oomph" default 0.5 (Material sums 0.46, Ahlin 0.6); s sharpness -0.7..+0.7 (Ahlin sharp = +0.67, diffuse = -0.43).
- Worked check (L=0, s=0.4): n=5 gives 6 layers ending `0 16px 20px -3px / 0.05`, first layer alpha 0.117.
- Dark mode: multiply O by about 2.5 and append a `0 0 0 1px` white-at-5% ring (Radix; Open Props 25% vs 1% strength).

**Light angle.** Material, Ahlin, Tailwind, Fluent, Radix and Open Props all use x = 0. Comeau uses x = y/2 (about 27 degrees from vertical, light up-left); Strobl defaults to 0.7 (35 degrees). Default L = 0; one global setting, mirrored under `dir=rtl`.

**Recipes** (starting points; "crisp", "long" and "glow" are DERIVED from Ahlin's ratios):

| Look | Recipe |
|---|---|
| Soft | S = 2, s = -0.4, k = 5 to 6 (Ahlin "dreamy": `0 1px 2px .07 ... 0 32px 64px .07`) |
| Crisp | S = 0.75, s = +0.67, k = 4 (Ahlin sharp) |
| Long | y doubles per layer, blur half of y (`0 2px 1px .09 ... 0 32px 16px .09`) |
| Coloured / glow | x = y = 0, two layers: blur B alpha 0.6 and blur 2B alpha 0.3, colour brand hue |
| Inset / pressed | drop outer layers, one `inset 0 2px 4px` at 0.05 to 0.2 (Tailwind `inset-shadow-sm`; Open Props `--inner-shadow-2` plus highlight `inset 0 -.5px 0 #fff`) |
| Hard / neo-brutalist | one layer `4px 4px 0 0 var(--border)`; press = translate(4px,4px) and shadow none. https://raw.githubusercontent.com/ekmas/neobrutalism-components/main/src/styling/globals.css |

## 3) Beginner versus advanced

**Beginner, one click:** a preset name plus one elevation step (1 to 6), one Tint toggle (on by default, hue taken from the surface). Everything in section 2 is derived. Comeau's vocabulary: Oomph, Crispy, Light, Background, Tint. Strobl deliberately offers only Distance, Intensity, Sharpness, Colour, Light position, arguing that raw alpha/blur/spread makes users "find good values" themselves.

**Advanced:** the same five or six generator parameters exposed as numbers, then a "detach to layers" action that freezes the computed list into editable rows (x, y, blur, spread, colour, alpha, inset, reorder, delete). Show the live CSS. HN feedback on a shadow generator (https://news.ycombinator.com/item?id=36401676): export buttons hard to find, live CSS wanted, "smooth" unexplained, every slider tick pushed a history entry.

**Model:** store parameters, not layers, until the user detaches. Then output is deterministic, re-derivable on a preset change, and cheap to store.

## 4) Pitfalls

1. **Forced colours:** `box-shadow` and `text-shadow` are forced to `none`, so an edge that relies on shadow disappears. https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/At-rules/@media/forced-colors. Add `@media (forced-colors: active)` with a 1px border or outline in a system colour; for focus rings use `outline-color: transparent` alongside the shadow. https://polypane.app/blog/forced-colors-explained-a-practical-guide/
2. **Black at 15% alpha on a dark surface is invisible** (see the dark-mode line in section 2).
3. **Layer count:** Strobl caps at 24 and warns against animating; my default cap is 6, expert cap 8, warn beyond 10. I found no measured benchmark, only Comeau's and an HN comment's anecdote about scroll cost. Treat the cap as caution, not data.
4. **Animating box-shadow repaints;** transition an `::after` opacity.
5. **Non-rectangular shapes:** `filter: drop-shadow` follows alpha and uses a different blur algorithm (Comeau); it has no spread or inset. Tailwind's drop-shadow tokens are single layers.
6. **Clipping and RTL:** `overflow: hidden` on a parent cuts long shadows; non-zero x must mirror under `dir=rtl`.

## 5) The one thing that surprised me

Sources contradict each other on how opacity should change with elevation. Comeau says it falls; Material Design Lite keeps 0.2 / 0.14 / 0.12 constant at every level and lets geometry carry the depth; Open Props actually raises strength up the scale. There is no consensus law, so the safest control is a single "Intensity" that stays constant across steps, with the elevation step changing geometry only.
