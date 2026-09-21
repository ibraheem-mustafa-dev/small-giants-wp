# Shadow controls — the practical model (council seat: The Practical One)

**Date:** 2026-09-21 · **Scope:** optimal user-facing shadow control set for SGS blocks, designed from first principles.

---

## 1. What the good tools actually do

**Figma** splits effects into a *list* of named effect rows (drop shadow / inner shadow / layer blur / background blur), each with its own visibility eye, colour+alpha, X, Y, blur, spread, and a cap of **8 per effect type**. Spread is silently ignored on shapes that cannot take it — a real trap ([Figma Learn](https://help.figma.com/hc/en-us/articles/360041488473-Apply-effects-to-layers), [Effect API](https://developers.figma.com/docs/widgets/api/type-Effect/)). Practitioner guidance is to define **3–5 elevation levels as styles, not one-off shadows per card** ([justfigma](https://justfigma.com/figma-effects-shadows-blur-and-elevation-for-ui/)).

**Webflow** puts box shadows under Style → Effects as a stackable list with inset/outset per entry, and a separate text-shadow stack under Typography ([Webflow Help](https://help.webflow.com/hc/en-us/articles/33961320572179-Box-shadow)). Tellingly, its most-installed shadow extension exists purely to **stack multiple declarations for realism** ([Better Shadows](https://webflow.com/integrations/better-shadows)) — proof the single-shadow UI is the gap.

**Framer** offers both a manual box-shadow stack *and* a one-click "realistic shadow" that auto-layers ([Coastal Themes](https://coastalthemes.com/tutorial/using-shadows-on-your-site)); its classic API exposed a known wart — changing `shadowColor` changed it **for all layers at once** ([Framer Classic](https://classic.framerbook.com/layers/shadow/)). Per-layer colour is non-negotiable.

**Gutenberg core** ships a preset-first panel: empty by default, `+` opens theme/user presets plus a custom editor, driven by `theme.json` shadow presets ([gutenberg#44651](https://github.com/WordPress/gutenberg/issues/44651), [dev blog](https://developer.wordpress.org/news/2023/01/using-the-box-shadow-feature-for-themes/)). Recent core work adds **state-scoped shadows** (pick a preset under a "States" menu, [PR#83185](https://github.com/WordPress/gutenberg/pull/83185)) and `text-shadow` following the same UI ([PR#79584](https://github.com/WordPress/gutenberg/pull/79584)).

**Chrome DevTools** proves the interaction model: a swatch next to the value opens a visual editor with a **draggable offset puck** plus numeric blur/spread, live-updating ([Dev Tips](https://umaar.com/dev-tips/116-box-shadow-and-text-shadow-editor/)).

**Elevation ladders** — Material's dp scale maps each level to **two stacked shadows (tight key + soft ambient)**; Tailwind ships `sm → 2xl` with most levels being two layers ([M3](https://m3.material.io/styles/elevation/applying-elevation), [Tailwind](https://tailwindcss.com/docs/box-shadow)). Layered-shadow guidance is unanimous: one shadow looks fake, 3–5 layers with decaying alpha look real ([Josh Comeau](https://www.joshwcomeau.com/css/designing-shadows/), [Tobias Ahlin](https://tobiasahlin.com/blog/layered-smooth-box-shadows/), [Smashing](https://www.smashingmagazine.com/2023/08/interesting-ways-use-css-shadows/)).

**Real complaints (builder-side):** Kadence had to ship *two* fixes — the hover Box Shadow control **inherited the resting default instead of its own** ([PR#1550](https://github.com/stellarwp/kadence-blocks/pull/1550)), and shadow state was stored as "does it paint" so **colour-only / inset-only / token picks were discarded as empty** ([PR#1515](https://github.com/stellarwp/kadence-blocks/pull/1515)). Bricks had hover shadows silently not applying ([forum](https://forum.bricksbuilder.io/t/solved-hover-state-box-shadow-not-working/5863)). These are the two bugs to design *out*, not fix later.

---

## 2. Recommended model — three tiers, one attribute

**Tier 1 · Simple (default view).** Three things only: an **Elevation** slider `None · 1 · 2 · 3 · 4 · 5` with live thumbnails, a **Look** segmented control (`Soft · Crisp · Glow · Inset`), and a **Shadow colour** swatch (theme tokens first, alpha included). No x/y/blur/spread. Elevation + Look resolves to a *generated multi-layer stack* (2–3 layers, decaying alpha) — beginners get Material-quality depth on one click, which single-slider builders never deliver.

**Tier 2 · Custom (one click: "Customise").** Reveals the **layer list**: rows showing a colour chip, a plain-English summary ("Soft, 12px down"), an eye toggle, and `+ Add layer`. Still hides raw numbers behind a per-row expander. Tier 1's controls stay visible and now act as a *transform* on the stack (raising Elevation scales all layers proportionally).

**Tier 3 · Advanced (per-row expander, or "Show all values").** Per layer: X, Y, blur, spread, colour+alpha, inset toggle, drag-handle reorder, duplicate, delete. Plus a **raw CSS field** (paste `0 1px 3px rgb(0 0 0/.1), …`) — this is what makes pixel-perfect reference cloning possible and is the single feature every competitor lacks.

**Movement between tiers is lossless because there is one canonical data shape:** an ordered array of layer objects plus a `preset` marker naming which Elevation/Look generated it. Editing any raw value clears the `preset` marker (badge changes to "Custom") but keeps the array. Re-picking an Elevation regenerates the array — behind an **undoable confirm** ("Replace your custom layers?"). Nothing is ever silently discarded. Store a **pick, not a paint-state** — the Kadence #1515 lesson: colour-only, inset-only, and `none` are all valid saved states.

**Defaults that look right on click one:** first enable = Elevation 2 / Soft / shadow colour = a token derived from the theme's darkest neutral at low alpha, rendering roughly `0 1px 2px rgb(0 0 0/.06), 0 4px 12px rgb(0 0 0/.10)`. Never pure black at high alpha; never a single 20px blur.

**Layer cap: 4.** Justification is empirical not arbitrary — layered-shadow guides converge on 3–5 for realism, Material uses 2, Tailwind ≤2; beyond 4 the visual return is nil while paint cost and stack-management UX degrade sharply. Figma's 8 is a graphics tool's budget, not a web page's. Cap at 4, disable `+ Add layer` at the cap with an explanatory tooltip, and allow the raw-CSS field to accept more only when cloning (flagged in the panel).

**Hover/state:** a **States** switcher at the top of the panel (`Normal · Hover · Focus`) exactly as core Gutenberg is going ([PR#83185](https://github.com/WordPress/gutenberg/pull/83185)) — never a separate detached "Hover" tab whose defaults drift from the resting value. Hover inherits from Normal until explicitly overridden, and the panel says so ("Same as Normal") rather than showing a stale default. Offer a one-click **"Lift on hover"** toggle (Elevation +1, 150ms `box-shadow` transition). Emit that transition inside `@media (prefers-reduced-motion: no-preference)`, or drive duration from a token zeroed under `reduce` — do not animate by default for everyone.

---

## 3. Accessibility — panel and output

**Panel:** every numeric field carries a visible `<label>` (not placeholder-only); the layer list is a `role="list"` with per-row accessible names ("Shadow layer 2, soft, 12 pixels down"); reorder must work from the keyboard (Alt+↑/↓ on a focused row, announced via a live region) — drag-only reorder fails SC 2.1.1. Layer identity must not be colour-chip-only: pair the chip with the text summary. Visible focus rings on every control, 44px targets.

**Output:** `box-shadow` is **removed entirely in forced-colors mode** ([MS Edge blog](https://blogs.windows.com/msedgedev/2020/09/17/styling-for-windows-high-contrast-with-new-standards-for-forced-colors/), [Sparkbox](https://sparkbox.com/foundry/supporting_high_contrast_mode)). So: never let a shadow be the *only* boundary for a card, modal or input, and never let it be the *only* focus indicator — pair with a transparent border or `outline` that forced-colors promotes to opaque. Emit a `@media (forced-colors: active)` border fallback automatically when the block's only boundary is a shadow. This is a framework-level guarantee, not a client responsibility.

---

## 4. Failure modes to design around

1. `filter: drop-shadow()` has **no spread and no inset** ([CSS-Tricks](https://css-tricks.com/breaking-css-box-shadow-vs-drop-shadow/), [MDN](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Values/filter-function/drop-shadow)). If a block ever routes shadows through `filter` for transparent PNGs/SVGs, spread and inset must be disabled in the UI with a stated reason — not silently dropped (Figma's exact trap).
2. **Huge blur is expensive** — blur radius drives paint area quadratically; cap blur in the UI (~100px) and warn above ~60px on repeated elements like card grids.
3. **`overflow: hidden` on an ancestor clips the shadow** ([SO](https://stackoverflow.com/questions/70802682/parents-overflow-hidden-doesnt-show-childs-box-shadow)) — carousels and grid wrappers are the usual culprits. Detect the ancestor in the editor and show an inline notice rather than letting the client conclude the control is broken.
4. **text-shadow has no spread and no inset** — a separate control set, not the same component re-pointed.
5. **Token-only colours break under a style variation** — store the token reference, resolve at render.

---

## 5. Lateral application

The identical **preset-ladder → layer-list → per-layer-advanced** shape solves **background layers** (stacked gradients/images/overlays: order, per-layer visibility, cap, raw-CSS paste), and equally **transforms/filters** and **border rules**. Build it once as a generic *ordered-effect-stack* control and three panels collapse into one — a real R-31-9 universality win.

---

## 6. Rejected

- **Single shadow, four sliders (Elementor/Bricks shape)** — cannot express realistic depth or a cloned reference; forces custom CSS, which tech-illiterate clients cannot write.
- **Presets only (core Gutenberg shape)** — fine for beginners, fatal for pixel-perfect cloning; no escape hatch.
- **Figma's 8-layer cap** — unjustified cost on the web.
- **Separate Hover tab with its own defaults** — the documented Kadence #1550 bug; States switcher instead.
- **Global "shadow colour" applied to all layers (Framer Classic)** — per-layer colour is required for realistic ambient+key stacks.
- **Drag-only reorder** — keyboard-inaccessible.
