# Focus indicators for buttons and links: design-system survey (B)

Read-only research, 17 October 2026. Every CSS excerpt below was fetched from the named file with `gh api` (or from the WordPress.org release zip) in this session. Anything not fetched is marked UNVERIFIED. No repo files or websites were touched; the only things written are this report and the PNGs beside it.

## Summary for the owner

1. The two designs you rejected are the standard "gap ring" (flat outline, offset 2px). It is what Radix, Mantine, Chakra, Park UI, Spectrum and Twenty Twenty-Five ship. It reads as detached because the gap shows the page behind it.
2. The designs that feel attached all do one of three things: draw the ring tight against the element in two colours (GOV.UK box, Primer primary button, WCAG technique C40); fill the gap with the element's own colour; or grow a ring out of the element with animation (Material 3). A soft halo (shadcn, Bootstrap) feels attached too, but alone it is too faint to pass.
3. No glow on its own is compliant. A glow is decoration; the compliant part is a solid 2px core. Every glow that works keeps one. Three tested glow-with-core snippets are in the glow section, with screenshots.
4. Correction to the brief: WCAG 2.4.11 is Focus Not Obscured (Minimum), which is about sticky headers hiding the focused element, not the ring's look. The ring's look is 2.4.7 Focus Visible (AA), 1.4.11 Non-text Contrast (AA, 3:1 against adjacent colours) and 2.4.13 Focus Appearance (AAA, new in 2.2). Source: https://www.w3.org/TR/WCAG22/ (fetched 17 Oct 2026).
5. Recommendation: the "bezel with bloom" (glow snippet G1 or G2, below) as the one unified style. It keeps a 2px solid two-tone core attached to the button, adds a soft bloom for the premium look, and works on any button colour and background.

## Survey table

Column "Look" is plain words. "Radius" says whether the indicator follows border-radius.

| System (repo path, ref) | Technique and CSS excerpt | Colour logic | Radius, forced-colors | Look |
|---|---|---|---|---|
| GOV.UK Frontend, link (`packages/govuk-frontend/src/govuk/helpers/_focused.scss::govuk-focused-text`, main ad8b0ca86c, 16 Oct 2026) | box-shadow plus background, with a transparent outline safety net. `outline: $govuk-focus-width solid transparent; color: focus-text; background-color: focus; box-shadow: 0 -2px focus, 0 4px focus-text; text-decoration: none;` Width token `$govuk-focus-width: 3px` (`settings/_measurements.scss`). Palette: focus = yellow `#ffdd00`, focus-text = black `#0b0c0c` (`settings/_colours-functional.scss`, `_colours-palette--internal.scss`). | Two-tone fixed pair: yellow fill, black underline bar. Colour does not adapt. | Square (GOV.UK has no radius). Forced-colors: the transparent outline becomes visible in the user's colours; comment in the file says so. | The link text turns black on a yellow highlight with a thick black underline. Loud, unmistakable, entirely attached. |
| GOV.UK Frontend, button (`components/button/_mixin.scss`, same ref) | `&:focus { border-color: focus; outline: 3px solid transparent; box-shadow: inset 0 0 0 1px focus; }` then `&:focus:not(:active):not(:hover) { border-color: focus; color: focus-text; background-color: focus; box-shadow: 0 2px 0 focus-text; }` | Button turns yellow with black text and a black bottom bar (replaces its green bar). | Square. Transparent outline for forced colours. | The whole button becomes the focus state: yellow face, black 2px base line. The indicator is the button. |
| GOV.UK `govuk-focused-box` (`_focused.scss`, same ref) | `outline: 3px solid transparent; box-shadow: 0 0 0 4px focus, 0 0 0 8px focus-text;` | Yellow band touching the element, black band outside it. | Follows radius (box-shadow). Transparent outline. | A thick yellow-then-black double bezel. This is the pattern closest to a two-tone attached ring. |
| Radix Themes (`packages/radix-ui-themes/src/components/_internal/base-button.css`, main 1faff10ac2, 11 Apr 2026) | Classic and solid variants: `&:where(:focus-visible) { outline: 2px solid var(--focus-8); outline-offset: 2px; }`. Soft and ghost variants: `outline: 2px solid var(--focus-8); outline-offset: -1px;`. Token: `--focus-8: var(--accent-8)` (`styles/tokens/color.css`). | Single colour, the theme accent step 8, so it follows the accent colour setting. | Outline follows radius in current browsers. No explicit forced-colors rule (UNVERIFIED beyond that, none found in the files read). | A thin mid-blue ring floating 2px off solid buttons; a ring drawn just inside soft and ghost buttons. Clean but detached on solid buttons. |
| GitHub Primer, primary button (`primer/react packages/postcss-preset-primer/src/mixins/focusOutlineOnEmphasis.css`, main 7f96c0d5f9; used from `packages/react/src/Button/ButtonBase.module.css`; same mixin in `primer/css src/support/mixins/misc.scss`, 0d0dcef626) | `outline: 2px solid var(--focus-outline-color, var(--focus-outlineColor)); outline-offset: -2px; box-shadow: inset 0 0 0 3px var(--fgColor-onEmphasis);` Other controls: `focusOutline` = same outline, `outline-offset: -2px`, `box-shadow: none`. Token `focus.outline-color` = `{borderColor.accent.emphasis}`, width 2px (`primer/primitives src/tokens/component/focus.json5`). | Two-tone inside the button: blue ring, then a 3px white (on-emphasis) inner band. Blue is one fixed accent. | Follows radius. `ButtonBase.module.css`: `@media (forced-colors: active) { &:focus { outline: solid 1px transparent; } }`. | A blue ring cut into the edge of the button with a white inner line, like a bezel inside the button. Attached, but it eats into the button face (this is the "sits inside" effect you disliked in candidate 2). |
| shadcn/ui (`apps/v4/registry/new-york-v4/ui/button.tsx`, main d2fba50ee5) | Tailwind classes: `outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50`; destructive adds `focus-visible:ring-destructive/20`. Token in `apps/v4/app/globals.css`: `--ring: oklch(0.708 0 0)` light, `oklch(0.556 0 0)` dark. | Ring colour at 50% opacity (a grey halo) plus the border snaps to full ring colour. Destructive swaps to red at 20%. | Box-shadow follows radius. `outline-none` removes the outline: no forced-colors fallback in this file (open issues below). | A soft 3px grey halo hugging the button with a crisper border. Attached and calm, but 50% grey fails 3:1 on many backgrounds. |
| Bootstrap 5.3.8 (`scss/_buttons.scss`, `scss/_variables.scss`, `scss/helpers/_focus-ring.scss`, tag v5.3.8) | `.btn:focus-visible { outline: 0; box-shadow: var(--bs-btn-focus-box-shadow); }` where `--bs-btn-focus-box-shadow: 0 0 0 .25rem rgba(var(--bs-btn-focus-shadow-rgb), .5)`. Global: `$focus-ring-width: .25rem; $focus-ring-opacity: .25; $focus-ring-color: rgba($primary, .25)`. Helper: `.focus-ring:focus { outline: 0; box-shadow: var(--bs-focus-ring-x,0) var(--bs-focus-ring-y,0) var(--bs-focus-ring-blur,0) var(--bs-focus-ring-width) var(--bs-focus-ring-color); }` | Per-variant: mixes the button's own colour with its border (15%) at 50% alpha, so it adapts to each button colour. | Follows radius. No outline fallback in `.btn` (`outline: 0`). Main branch is v6 alpha (`--focus-ring: 3px solid var(--primary-focus-ring)`), not used for this row. | A pale 4px halo in a tint of the button's own colour. Attached and pretty; low contrast against white (the well-known weakness). |
| Material 3 web (`material-components/material-web focus/internal/_focus-ring.scss`, `tokens/_md-comp-focus-ring.scss`, main 60c3e5377e) | A dedicated `<md-focus-ring>` element: `outline: $width solid currentColor; inset: calc(-1 * $outward-offset);` with radius `calc($shape + $outward-offset)`. Tokens: `width 3px`, `outward-offset 2px`, `inward-offset 0px`, `active-width 8px`, `color` = secondary role, `duration` = long4. Animation `outward-grow`: outline grows from 0 to 8px then settles to 3px; `@media (prefers-reduced-motion) { :host { animation: none; } }`. Shown only when `control.matches(':focus-visible')`. | One role colour (secondary), set per theme. | Shape-matched: radius is the button radius plus the offset, so the ring is concentric. Forced-colors rule exists elsewhere in the button styles. | A 3px ring 2px out that blooms from the button edge in about half a second, then settles. The animation is what makes it feel connected. |
| Adobe Spectrum 2 / React Aria (`packages/@react-spectrum/s2/style/index.ts::focusRing`, main 261344335e; React Aria starter `starters/tailwind/src/utils.ts`) | `outlineStyle: {default:'none', isFocusVisible:'solid'}, outlineColor: {default:'focus-ring', forcedColors:'Highlight'}, outlineWidth: 2, outlineOffset: 2`. Starter: `outline outline-blue-600 dark:outline-blue-500 forced-colors:outline-[Highlight] outline-offset-2`. | One token, `focus-indicator-color`, with `Highlight` in forced colours. Light/dark pair in the starter. | Follows radius. Best forced-colors handling in the survey. | A 2px ring 2px away. Same look as Radix. |
| Chakra UI v3 and Park UI (`packages/panda-preset/src/utilities.ts::createFocusRing`, chakra-ui main fa9696f328, 12 Oct 2026; `packages/react/src/theme/recipes/button.ts` and Park UI `packages/preset/src/recipes/button.ts` set `focusVisibleRing: "outside"`) | `outside`: `outlineWidth: var(--focus-ring-width, 2px); outlineOffset: var(--focus-ring-offset, 2px); outlineStyle: var(--focus-ring-style, solid); outlineColor: var(--focus-ring-color)`. `mixed`: `outlineWidth: 3px; outlineColor: color-mix(in srgb, var(--focus-ring-color), transparent 60%); borderColor: var(--focus-ring-color)`. `inside`: offset 0, width 1px. Colour comes from `token("colors.colorPalette.focusRing")`. | The ring colour is the button's own colour palette (`colorPalette.focusRing`), so a red button gets a red ring. | Outline follows radius. No forced-colors branch in this utility. Chakra's `packages/react` copy of the utility was not read (UNVERIFIED; docs describe the same props). | `outside` is the detached ring. `mixed` is a translucent 3px band plus a solid border: a glow-like attached ring in the button's colour. |
| Mantine (`packages/@mantine/core/src/core/MantineProvider/global.css`, master e243f7f999) | `.mantine-focus-auto:focus-visible { outline: 2px solid var(--mantine-primary-color-filled); outline-offset: 2px; }` | Single theme colour. | Outline. No forced-colors rule in that file. | The same detached 2px ring. |
| Tailwind core (`packages/tailwindcss/src/utilities.ts`, main f7f47f8e98) | `ring` utilities write `--tw-ring-shadow` (box-shadow); `outline-hidden` = `outline-style: none` plus `@media (forced-colors: active) { outline: 2px solid transparent; outline-offset: 2px }`. Preflight only restyles `:-moz-focusring`. | n/a (utilities). | `outline-hidden` is the forced-colors-safe way to hide the outline. | n/a |
| Tailwind UI / Catalyst | Closed source. UNVERIFIED. A public-repo search for the usual `focus-visible:outline-2 focus-visible:outline-offset-2` string returned nothing. | | | |
| Apple HIG (`developer.apple.com/tutorials/data/design/human-interface-guidelines/focus-and-selection.json`, fetched 17 Oct 2026) | No CSS. Text read: "Consider creating custom focus effects only if it's absolutely necessary" and that full keyboard access means buttons do not need app-drawn focus on iPadOS/macOS. | The system draws it in the user's accent colour. | n/a | The system ring: a rounded accent-coloured outline that follows the shape and is user-configurable. Lesson: do not block the user's own settings. |
| WordPress core block button (`WordPress/gutenberg packages/block-library/src/button/style.scss`, trunk 4f76eb6bce) | No focus rule at all in the file (`grep -n focus` returns nothing). Focus comes from the theme. | n/a | n/a | Whatever the browser or theme paints. |
| Twenty Twenty-Five (`WordPress/WordPress wp-content/themes/twentytwentyfive/style.css` and `theme.json`, a9cd35b823, 16 Oct 2026) | `:where(.wp-site-blocks *:focus) { outline-width: 2px; outline-style: solid; }` and `theme.json` `styles.elements.button.:focus.outline { color: var:preset|color|accent-4; offset: 2px }`. | The global rule has no colour, so it is `currentColor`; the button rule sets accent-4. | Outline; uses `:focus`, not `:focus-visible`. | A 2px accent ring 2px out. Same detached look. |
| Gutenberg admin UI, new design system (`packages/base-styles/_mixins.scss::outset-ring__focus`, `packages/ui/src/utils/css/_mixins.scss`, trunk) | `outline: var(--wpds-border-width-focus) solid var(--focus-color, var(--wpds-color-stroke-focus)); outline-offset: var(--wpds-border-width-focus);` Admin only, not front-end blocks. | One token. | Outline follows radius. | A thin ring detached by one ring-width. Its maintainers discuss the "detached ring" complaint in issue 81778 (below). |
| Kadence Blocks 3.8.0 (WordPress.org zip, `dist/style-blocks-advancedbtn.css`) and Kadence theme 1.5.2 (`assets/css/global.min.css`) | Button focus is the hover look: `.kb-button.kb-btn-global-fill:focus { color: var(--global-palette-btn-hover); background: var(--global-palette-btn-bg-hover) }`; theme: `button:focus,.button:focus,.wp-block-button__link:focus… { color: …btn-hover; background: …btn-bg-hover; box-shadow: 0 15px 25px -7px rgba(0,0,0,.1) }`. Also `.hide-focus-outline *:focus { outline: 0 }`. | Colour change only, no ring. | n/a | Button changes colour and lifts. No distinct keyboard indicator. |
| Spectra (Ultimate Addons for Gutenberg 2.20.5, WordPress.org zip) | `assets/css/blocks/buttons.css`, `buttons-child.css`, `marketing-button.css` contain zero `focus` rules. | None. | n/a | Browser default only. |
| GenerateBlocks 2.5.0 and GeneratePress 3.6.1 (WordPress.org zips) | GenerateBlocks `includes/blocks/class-button.php`: hover rules are written as `selector:hover, selector:active, selector:focus`; editor can set a focus colour. GeneratePress `assets/css/main.css`: `:-moz-focusring { outline: 1px dotted ButtonText; }` and `.using-mouse :focus { outline: 0; }` (a JS class). | Colour change only. | Browser default ring for keyboard users. | Default browser ring. |
| Astra 4.14.1 (WordPress.org zip, `assets/css/minified/style.min.css`) | `.ast-button:focus,.button:focus,button:focus,input[type=submit]:focus… { border-color: var(--ast-border-color); outline: 0 }` and `a:focus { outline: thin dotted }`. | None. | n/a | Buttons lose their outline entirely at the base layer. A known weak spot. |
| Linear, Vercel Geist, Stripe, Framer, Raycast, Arc | Closed source and not fetched. UNVERIFIED. | | | |
| Josh Comeau, Adam Argyle focus-ring articles | Not found at the guessed URLs (404); a search tool returned noise. UNVERIFIED. The two pages that did load (Josh's shadow-design article, web.dev border animations) are used below only for what they say. | | | |

## Failure modes found

1. Outline colour inherited from the text colour becomes invisible. Gutenberg issue 81891, "Social Icons: focus indicator can be invisible with default styles" (https://github.com/WordPress/gutenberg/issues/81891): Twenty Twenty-Five's colourless `outline` rule makes the ring `currentColor`, white on white icons. Fix direction there: set an explicit `outline-color`. This is a direct warning for any `currentColor` design.
2. Ring clipped by an `overflow: hidden` parent or scroll container. shadcn issue 9003 (https://github.com/shadcn-ui/ui/issues/9003), with PRs 9005 and 9100 attempting fixes; the reporter points to Primer's inside ring as the avoidance. Gutenberg issue 79813 (https://github.com/WordPress/gutenberg/issues/79813) lists "focus outline is cut off, too thick, double focus outline" after its button change.
3. Double ring when a theme and a component both draw one. Same Gutenberg issue 79813. Rule: one focus rule, owned in one place, with no second mechanism layered over it.
4. Box-shadow rings vanish in Windows high contrast. Gutenberg issue 80138 (https://github.com/WordPress/gutenberg/issues/80138) explains that box-shadow is not displayed in forced colours so a transparent outline is needed, and proposes moving to outline.
5. `outline: none` removes the forced-colors fallback. shadcn issue 10101 (https://github.com/shadcn-ui/ui/issues/10101) and PR 11674 (https://github.com/shadcn-ui/ui/pull/11674). Note: I checked Tailwind's source (`utilities.ts`): `outline-hidden` is the one that adds the forced-colors outline; the PR description states it the wrong way round, the issue text is right.
6. The "detached ring" complaint itself. Gutenberg issue 81778, "Review the accessibility of the new focus style ring" (https://github.com/WordPress/gutenberg/issues/81778): the reporter dislikes the offset look; a maintainer answers that WCAG does not require the ring to touch the control and the Understanding doc says an offset can help visibility; another notes core buttons have used an offset since 2019. The same issue records a real flaw: drawing the ring on a sibling element breaks the user's own OS focus colour (macOS full keyboard access in Safari). Keep the ring on the focusable element.
7. Bootstrap shadow behaviour changes break focus. Bootstrap issue 37106 (https://github.com/twbs/bootstrap/issues/37106): the 5.2.1 release dropped the button focus box-shadow when `$enable-shadows` was off.
8. Safari before 16.4 does not make `outline` follow `border-radius` (MDN browser-compat-data `css/properties/outline.json`, fetched 17 Oct 2026). Irrelevant for new browsers; matters only if old Safari support is required.
9. Low contrast halos. Bootstrap's 25% blue and shadcn's 50% grey look good but cannot satisfy 3:1 alone. WCAG 2.4.13 Note 1 also says shadow and glow effects outside the component do not count as part of the component when measuring the indicator, so a glow cannot be the compliant part.

Searches that returned nothing useful: several multi-word `gh search issues` queries returned empty; the REST search API (`gh api search/issues`) worked and was used instead.

## Ranked top 5

Scored on (a) aesthetics, attached not floating, (b) robustness on any background, (c) WCAG fit (2.4.7, 1.4.11, and 2.4.13 as a stretch), (d) ease of theming with custom properties. Scores are my judgement, 1 to 5.

| Rank | Design | a | b | c | d | Why |
|---|---|---|---|---|---|---|
| 1 | Two-tone attached bezel (WCAG technique C40, GOV.UK box, Primer): light inner band plus dark outer band, box-shadow, with a transparent outline for forced colours | 4 | 5 | 5 | 5 | Works on any button colour and background by construction (two colours with 9:1 between them guarantee one passes 3:1 on any solid background, per the C40 text). Hugs the button, follows the radius. |
| 2 | Material 3 animated ring, shape-matched | 5 | 3 | 4 | 4 | Best motion and the most "designed" feel; single colour so robustness depends on token choice; needs reduced-motion handling (it has it). |
| 3 | Own-colour bezel: gap filled with the button's colour, ring in the button's text colour (my synthesis; Bootstrap and Chakra `mixed` are the nearest precedents) | 5 | 4 | 4 | 4 | Looks like the button grew a rim. Reasoning: the text colour always contrasts the button, and the filled gap changes the silhouette against the page. Not rendered by me, so the look is UNVERIFIED. |
| 4 | Chakra `mixed` and Bootstrap halo (translucent band plus solid border in the button's own palette) | 4 | 2 | 2 | 5 | Pretty and fully themed, but the translucent band is the weak part for contrast. Needs a solid core added to pass. |
| 5 | Offset ring (Radix, Spectrum, Mantine, Twenty Twenty-Five) | 2 | 3 | 4 | 5 | The safe default and the thing you rejected. Compliant and simple, detached by design. |

GOV.UK's full-button yellow state is the most robust of all but cannot be made to fit a pill-shaped brand button, so it is excluded from the ranking.

## Top 3 drop-in CSS (rings, custom properties)

I did not render these three ring snippets as images (only the glow ones below were rendered); G1 and G2 below contain snippet 1's core and were rendered. Snippet 3 is UNVERIFIED visually.

Snippet 1, two-tone bezel, any button and any background:

```css
:root {
  --sgs-focus-light: #fff;
  --sgs-focus-dark: #0b1020;
  --sgs-focus-width: 2px;
}
.sgs-button:focus-visible,
.sgs-link-button:focus-visible {
  outline: var(--sgs-focus-width) solid transparent; /* forced-colors safety net: becomes visible in high contrast */
  box-shadow:
    0 0 0 var(--sgs-focus-width) var(--sgs-focus-light),
    0 0 0 calc(var(--sgs-focus-width) * 2) var(--sgs-focus-dark);
}
@media (forced-colors: active) {
  .sgs-button:focus-visible { outline-color: Highlight; box-shadow: none; }
}
```

Snippet 2, Material-style animated ring, single token (colour must be chosen to reach 3:1 on the page; use snippet 1 where backgrounds vary):

```css
:root { --sgs-focus-color: #2457f5; --sgs-focus-offset: 2px; --sgs-focus-width: 3px; }
@keyframes sgs-focus-grow { from { outline-width: 0; } 60% { outline-width: 8px; } to { outline-width: var(--sgs-focus-width); } }
.sgs-button:focus-visible {
  outline: var(--sgs-focus-width) solid var(--sgs-focus-color);
  outline-offset: var(--sgs-focus-offset);
  animation: sgs-focus-grow 400ms cubic-bezier(.2, 0, 0, 1);
}
@media (prefers-reduced-motion: reduce) { .sgs-button:focus-visible { animation: none; } }
@media (forced-colors: active) { .sgs-button:focus-visible { outline-color: Highlight; } }
```

Snippet 3, own-colour bezel (button must expose its background as `--sgs-button-bg`; ghost buttons set it to `transparent`, which degrades to a plain offset ring in the text colour):

```css
.sgs-button:focus-visible {
  outline: 2px solid currentColor;
  outline-offset: 3px;
  box-shadow: 0 0 0 3px var(--sgs-button-bg, transparent);
}
@media (forced-colors: active) { .sgs-button:focus-visible { outline-color: Highlight; box-shadow: none; } }
```

Check for snippet 3 before adopting: on a button whose text colour equals the page colour and whose background also equals the page colour the ring vanishes; that combination cannot occur while the button text meets 4.5:1 against its own background.

## Glow-style focus (what the aesthetic sites do)

### 1. Who uses a glow, and the exact CSS

Verified from source:

- Bootstrap 5.3.8 (tag v5.3.8, `scss/_variables.scss`): `$focus-ring-box-shadow: 0 0 $focus-ring-blur $focus-ring-width $focus-ring-color` with width `.25rem`, blur `0`, colour `rgba($primary, .25)`; button version `0 0 0 .25rem rgba(var(--bs-btn-focus-shadow-rgb), .5)`. Look: a pale flat 4px halo, no blur, no solid core. The `.focus-ring` helper exposes `--bs-focus-ring-x/y/blur` so a true blur is a one-variable change. No core, so it fails 3:1 on white.
- shadcn/ui (`button.tsx`, main d2fba50ee5): `focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50`. Look: 3px translucent grey-blue band plus a solid border colour. The solid border acts as the core; the 50% band is the glow. This is the only mainstream system that pairs a core with a halo in one rule, though the "core" is only the 1px border.
- Chakra v3 `mixed` ring: 3px outline at 40% opacity of the palette colour plus `borderColor` full strength. Same idea, built on outline. (`packages/panda-preset/src/utilities.ts`.)
- Magic UI `rainbow-button.tsx` (magicuidesign/magicui, main 85f97fd27b): the button uses `focus-visible:ring-[3px]`, and its decorative glow is a `before:` pseudo-element, `before:h-1/5 before:w-3/5 before:[filter:blur(0.75rem)]` with an animated multi-colour gradient under the button. That glow is hover decoration, not the focus indicator; keyboard focus is the plain ring. Magic UI `shimmer-button.tsx` rotates a `conic-gradient` with `animate-spin-around`. `border-beam.tsx` masks a gradient to the border with `mask-intersect` and `[mask-clip:padding-box,border-box]`.
- web.dev "CSS border animations" (https://web.dev/articles/css-border-animations, fetched 17 Oct 2026): the standard technique for the animated conic border. `@property --angle { syntax: "<angle>"; initial-value: 0deg; inherits: false } @keyframes rotate { to { --angle: 360deg } }` and `conic-gradient(from var(--angle), ...)`. Browser support quoted there: Chrome 85, Edge 85, Firefox 128, Safari 16.4. It also notes `border-image` does not follow `border-radius`, so use the masked pseudo-element.
- Josh Comeau, designing shadows (https://www.joshwcomeau.com/css/designing-shadows/): the page loaded and is about layered shadows for depth; I did not extract a focus-specific recipe from it. The layering principle (several shadows with growing blur and falling opacity) is what the snippets below use. Treat the attribution as general principle only.

UNVERIFIED (closed source or no source reached): Linear, Vercel/Geist, Stripe, Framer, Raycast, Arc, Tailwind UI/Catalyst, Aceternity UI, 21st.dev, and Adam Argyle's focus-ring articles. I will not describe their CSS from memory. Primer and GOV.UK deliberately avoid glows: both use solid two-tone rings and say why (visibility first).

Pattern across everything verified: every glow that is acceptable keeps a solid element (the border, a 2px core band, or a transparent outline for forced colours). None relies on blur alone.

### 2. Making a glow compliant

- Solid core plus bloom. The core (2px, solid, two-tone) carries 2.4.7 and 1.4.11. The bloom is decoration. WCAG 2.4.13 Note 1 says shadow and glow outside the component are not counted when measuring the indicator, so do not count on the bloom for 2.4.13.
- 3:1 against adjacent colours (1.4.11). Use the two-colour pair (C40: https://www.w3.org/WAI/WCAG22/Techniques/css/C40; the page says two colours at least 9:1 apart always leave one at 3:1 on any solid background). The C40 sample is `outline: 2px #F9F9F9 solid; outline-offset: 0; box-shadow: 0 0 0 4px #193146;`. Sara Soueidan's guide uses `outline: 3px solid black; box-shadow: 0 0 6px white` style layering: `:focus-visible { outline: 3px solid black; box-shadow: 0 0 0 6px white; }`.
- Forced colours: box-shadow is not drawn, so keep `outline: 2px solid transparent` (visible in forced colours). Tailwind's own `outline-hidden` encodes this: `outline-style: none` plus a forced-colors block of `outline: 2px solid transparent; outline-offset: 2px`. Add `@media (forced-colors: active) { …:focus-visible { outline-color: Highlight; box-shadow: none; } }`.
- Light and dark pages. A glow in one colour disappears on a page of that colour: white glow on white, navy on navy. In my renders the blue bloom (G1) is clear on white, faint on the navy-ish dark page and faint on the photo; the two-tone bloom (G2) shows a dark smudge on white and a white halo on dark. A coloured, dark-tinted or two-layer bloom is the fix. `filter: drop-shadow()` follows the painted shape and costs more; `mix-blend-mode` is unpredictable over photos. I did not test either, UNVERIFIED.
- Performance. Large blur box-shadows are cheap when static and only drawn on the focused element, so the cost is negligible. Animating a box-shadow repaints every frame; animate only `opacity` or `transform` of a glow pseudo-element, and add `will-change: opacity` only if profiling shows a need. The conic border animates a registered custom property (`--g-angle`), which repaints each frame: acceptable for one focused element, but I did not profile it, UNVERIFIED. Limit it to the focused element and stop it in reduced motion.
- `prefers-reduced-motion: reduce`: stop the rotation and keep the static ring. Material's focus ring does the same (`animation: none`).
- Keep the indicator on the focusable element itself (Gutenberg 81778), use `:focus-visible` not `:focus`, own it in one rule (Gutenberg 79813).

### 3. Three glow-with-core snippets, rendered

Rendered with headless Chromium 145 (Playwright for Python) from a local file, `file:///` pages in the session scratchpad. Each image shows a yellow pill and a navy pill, both in the focus state, on three backgrounds. A separate run confirmed real keyboard focus (Tab) applies the same box-shadow: computed value began `rgb(255, 255, 255) 0px 0px 0px 2px, rgb(36, 87, 245) 0px 0px 0px 4px, ...`. The conic ring's rotation is an animation, so each PNG is one instant of it. Test page and CSS: `C:\Users\Bean\AppData\Local\Temp\claude\c--Users-Bean-Projects-small-giants-wp\0100c312-693d-435f-9ba0-1e26530b6abd\scratchpad\t\glow.css` and `glow.html`.

Images (all in `C:\Users\Bean\Projects\small-giants-wp\.claude\reports\2026-10-17-focus-indicator\`): `B-glow-1-light.png`, `B-glow-1-dark.png`, `B-glow-1-photo.png`, `B-glow-2-light.png`, `B-glow-2-dark.png`, `B-glow-2-photo.png`, `B-glow-3-light.png`, `B-glow-3-dark.png`, `B-glow-3-photo.png`.

#### G1, monochrome brand-accent glow with a solid core

```css
:root { --sgs-focus-accent: #2457f5; --sgs-focus-core: #2457f5; --sgs-focus-light: #fff; }
.sgs-button:focus-visible {
  outline: 2px solid transparent;
  box-shadow:
    0 0 0 2px var(--sgs-focus-light),
    0 0 0 4px var(--sgs-focus-core),
    0 0 12px 4px color-mix(in srgb, var(--sgs-focus-accent) 60%, transparent),
    0 0 32px 10px color-mix(in srgb, var(--sgs-focus-accent) 32%, transparent);
}
@media (forced-colors: active) { .sgs-button:focus-visible { outline-color: Highlight; box-shadow: none; } }
```

What I saw. Light: each pill has a crisp white hairline against the button, then a 2px blue ring, then a soft blue bloom fading out about 30px. Reads as a lit rim; clearly attached; very premium on white. Dark: the white hairline and blue ring stand out strongly; the bloom is subtle because blue on near-black has little brightness. Photo: the white band and blue ring are clear; the bloom is barely visible over the blue and tan areas. Verdict: best-looking on light pages, still safe elsewhere because the core does the work. Uses one brand colour, so it needs a per-site `--sgs-focus-accent` (and checking the core reaches 3:1 on that site's page colour; the white inner band carries it on dark pages).

#### G2, two-tone dark plus light bloom, any background

```css
:root { --sgs-focus-light: #fff; --sgs-focus-dark: #0b1020; }
.sgs-button:focus-visible {
  outline: 2px solid transparent;
  box-shadow:
    0 0 0 2px var(--sgs-focus-light),
    0 0 0 4px var(--sgs-focus-dark),
    0 0 14px 5px color-mix(in srgb, var(--sgs-focus-light) 55%, transparent),
    0 0 30px 10px color-mix(in srgb, var(--sgs-focus-dark) 35%, transparent);
}
@media (forced-colors: active) { .sgs-button:focus-visible { outline-color: Highlight; box-shadow: none; } }
```

What I saw. Light: a white hairline, a thin near-black ring, and a grey soft shadow around it; looks like the button is lifted off the page with a sharp keyline, tidy but monochrome. Dark: the white hairline, dark ring and a white halo around the button; clearly glowing and very legible. Photo: the same white-and-black keyline with a grey-white haze, legible over every region (tan, green, blue). Verdict: the most robust, brand-neutral and works untouched on every client; less colourful and less "wow" than G1 or G3.

#### G3, animated conic-gradient border glow with a static fallback

```css
:root { --sgs-focus-light: #fff; --sgs-focus-dark: #0b1020; }
@property --sgs-angle { syntax: "<angle>"; initial-value: 0deg; inherits: false; }
@keyframes sgs-spin { to { --sgs-angle: 360deg; } }

.sgs-button:focus-visible {                       /* static fallback and the compliant core */
  outline: 2px solid transparent;
  box-shadow: 0 0 0 2px var(--sgs-focus-light), 0 0 0 4px var(--sgs-focus-dark);
}
@supports (mask-composite: exclude) and (background: conic-gradient(from 0deg, red, blue)) {
  .sgs-button:focus-visible::before,
  .sgs-button:focus-visible::after {
    content: ""; position: absolute; border-radius: inherit; pointer-events: none;
    background: conic-gradient(from var(--sgs-angle), #2457f5, #7b2ff7, #d6249f, #ff7a18, #2457f5);
    -webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
    -webkit-mask-composite: xor;
    mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
    mask-composite: exclude;
    animation: sgs-spin 3s linear infinite;
  }
  .sgs-button:focus-visible::before { inset: -6px;  padding: 2px; }                       /* crisp gradient ring */
  .sgs-button:focus-visible::after  { inset: -14px; padding: 7px; filter: blur(7px); opacity: .55; } /* bloom */
}
@media (prefers-reduced-motion: reduce) { .sgs-button::before, .sgs-button::after { animation: none !important; } }
@media (forced-colors: active) { .sgs-button:focus-visible { outline-color: Highlight; box-shadow: none; } .sgs-button::before, .sgs-button::after { display: none; } }
```

The `.sgs-button` needs `position: relative`. The ring and bloom are masked to a band so the gradient never tints the button face (my first attempt did tint the face, because a blurred full-size layer sits above the button's own background; the masked bands fixed it, confirmed in the final renders).

What I saw. Light: white hairline, thin dark core, then a rainbow ring (blue, violet, pink, orange) with a soft pastel bloom that is strongest where the gradient is warm; colourful and clearly "designed". Dark: richer; the orange, magenta and blue glow strongly against the dark page. Photo: the ring is visible but the bloom competes with the photo colours and looks busier. Verdict: the most striking, but busiest; it brings a rainbow to a client who may not want one, so the colours must be per-site tokens, and it needs the static core underneath (it is there). Animation cost not profiled, UNVERIFIED.

### Ranking of the glow snippets

By aesthetics: G3 (most striking on dark), then G1 (most refined on light), then G2. By robustness on any background and client: G2, then G1, then G3. Overall recommendation: G1 as the default style with the accent taken from the client's brand token and the core pair kept (white inner band plus accent core); G2 as the automatic fallback when no accent is set or the page background is unknown; G3 only as an opt-in "signature" variant for hero buttons if the owner wants motion.

## Sources (repo path, ref, date read; all read 17 Oct 2026)

- alphagov/govuk-frontend main ad8b0ca86c (16 Oct 2026): `packages/govuk-frontend/src/govuk/helpers/_focused.scss`, `components/button/_mixin.scss`, `settings/_colours-functional.scss`, `settings/_colours-palette--internal.scss`, `settings/_measurements.scss`, `helpers/_links.scss`.
- radix-ui/themes main 1faff10ac2 (11 Apr 2026): `packages/radix-ui-themes/src/components/_internal/base-button.css`, `button.css`, `link.css`, `styles/tokens/color.css`.
- primer/react main 7f96c0d5f9: `packages/postcss-preset-primer/src/mixins/focusOutline.css`, `focusOutlineOnEmphasis.css`, `packages/react/src/Button/ButtonBase.module.css`. primer/css main 0d0dcef626: `src/buttons/button.scss`, `src/support/mixins/misc.scss`. primer/primitives main: `src/tokens/component/focus.json5`.
- shadcn-ui/ui main d2fba50ee5: `apps/v4/registry/new-york-v4/ui/button.tsx`, `apps/v4/registry/bases/radix/ui/button.tsx`, `apps/v4/app/globals.css`. Issues: 426, 9003, 10101, PR 11674.
- twbs/bootstrap tag v5.3.8 (latest release): `scss/_buttons.scss`, `scss/_variables.scss`, `scss/_root.scss`, `scss/helpers/_focus-ring.scss`. main 548f671d0f is v6 alpha (`--focus-ring` tokens), read for comparison only.
- material-components/material-web main 60c3e5377e: `focus/internal/_focus-ring.scss`, `focus/internal/focus-ring.ts`, `tokens/_md-comp-focus-ring.scss`, `button/internal/_shared.scss`, `button/internal/button.ts`.
- adobe/react-spectrum main 261344335e: `packages/@react-spectrum/s2/style/index.ts`, `style/spectrum-theme.ts`, `src/Button.tsx`, `starters/tailwind/src/utils.ts`.
- chakra-ui/chakra-ui main fa9696f328: `packages/panda-preset/src/utilities.ts`, `packages/react/src/theme/recipes/button.ts`, `apps/www/content/docs/styling/focus-ring.mdx`. cschroeter/park-ui main 102769cc91: `packages/preset/src/recipes/button.ts`. mantinedev/mantine master e243f7f999: `packages/@mantine/core/src/core/MantineProvider/global.css`.
- tailwindlabs/tailwindcss main f7f47f8e98: `packages/tailwindcss/src/utilities.ts`, `preflight.css`.
- WordPress/gutenberg trunk 4f76eb6bce: `packages/block-library/src/button/style.scss`, `packages/base-styles/_mixins.scss`, `packages/ui/src/utils/css/_mixins.scss`, `focus.module.scss`. WordPress/wordpress-develop `src/wp-includes/css/buttons.css`. WordPress/WordPress a9cd35b823: `wp-content/themes/twentytwentyfive/style.css`, `theme.json`. Gutenberg issues 79813, 80138, 81778, 81891.
- WordPress.org release zips (downloads.wordpress.org): astra 4.14.1, generatepress 3.6.1, generateblocks 2.5.0, ultimate-addons-for-gutenberg 2.20.5, kadence-blocks 3.8.0, kadence theme 1.5.2. GitHub has no public repo for Astra, GeneratePress, GenerateBlocks or Spectra, so release zips were read instead; Kadence Blocks is at stellarwp/kadence-blocks (zip read).
- magicuidesign/magicui main 85f97fd27b (11 Oct 2026): `apps/www/registry/magicui/rainbow-button.tsx`, `shimmer-button.tsx`, `border-beam.tsx`.
- Standards: https://www.w3.org/TR/WCAG22/ (2.4.11, 2.4.12, 2.4.13, 1.4.11), https://www.w3.org/WAI/WCAG22/Understanding/focus-appearance.html, https://www.w3.org/WAI/WCAG22/Techniques/css/C40, https://www.sarasoueidan.com/blog/focus-indicators/, https://web.dev/articles/css-border-animations, https://www.joshwcomeau.com/css/designing-shadows/ (general principle only), mdn/browser-compat-data `css/properties/outline.json` and `css/types/color.json` (`color-mix`: Chrome 111, Firefox 113, Safari 16.2; `contrast-color`: Chrome 147, Firefox 146, Safari 26, so it could later pick the core colour automatically; not used in the snippets).
- Apple: `developer.apple.com/tutorials/data/design/human-interface-guidelines/focus-and-selection.json`.
