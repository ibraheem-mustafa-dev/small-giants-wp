# Keyboard focus indicators on buttons and links: standards and technique

Research date: 2026-10-17. Read-only research; no repo files, sites or deploys touched. Every claim below was checked against the page named in Sources, or against a test I ran in Chrome 155 (system Chrome, Windows). Anything I could not check is marked UNVERIFIED.

## Summary in plain English

The two candidates were disliked for a real reason, not just taste. A floating outline with a transparent gap reads as "a line near the button", and stacked shadows drawn inside the button read as decoration. The current standard of care is the two-colour ring (a dark band and a light band, each at least 2px), drawn flush against the button edge so it reads as part of the button. It is what the W3C documents as Technique C40, and it is the only approach that is guaranteed visible on any background. My ranked recommendations are: 1) Twin Band (flush two-colour ring), 2) Inset Keyline (a ring drawn inside the button face, independent of the page behind it), 3) Socket (a ring separated from the button by a gap filled with the button's own colour).

I rendered all three plus the current style on light, dark and multi-colour "photo" backgrounds, on a yellow and a navy pill, with the real CSS below, and again in emulated Windows forced-colours mode. The descriptions of how each looks come from those screenshots (kept in the session scratchpad, not in the repo).

## 1. Requirements (WCAG)

### 2.4.7 Focus Visible (Level AA)

Text: "Any keyboard operable user interface has a mode of operation where the keyboard focus indicator is visible." It sets no size, colour or contrast. Understanding says the indicator "must not be time limited" and that, because focus indicators are non-text content, they are also subject to 1.4.11 Non-text Contrast. Sufficient techniques listed include G195 (author-supplied indicator), C40 (two-colour indicator) and C45 (`:focus-visible`). Failure F78 covers styling outlines and borders so the indicator becomes non-visible. Source: Understanding 2.4.7.

### 1.4.11 Non-text Contrast (Level AA)

The focus indicator must have at least 3:1 contrast against the adjacent colours (the colours next to it), not against its own unfocused state. Where the indicator is offset from the button, the adjacent colour is the page background; where it is inset, the adjacent colour is the button face. Source: Understanding 2.4.13, section "Relationship with Non-text Contrast", and Sara Soueidan's guide.

### 2.4.11 Focus Not Obscured (Minimum) (Level AA)

Text: "When a user interface component receives keyboard focus, the component is not entirely hidden due to author-created content." It is about the focused component, not the ring: the Understanding doc says the component "does not include the focus indicator", but adds that a fully obscured indicator would probably fail 2.4.7. Sticky headers, sticky footers and non-modal dialogs are the typical offenders. Named fixes: make the banner modal, or use scroll padding so sticky content does not overlap. The AAA sibling (2.4.12 Enhanced) wants none of the component hidden; I did not fetch its text. Source: Understanding 2.4.11.

### 2.4.13 Focus Appearance (Level AAA in the published WCAG 2.2)

Text: when the indicator is visible, an area of it "is at least as large as the area of a 2 CSS pixel thick perimeter of the unfocused component or sub-component, and has a contrast ratio of at least 3:1 between the same pixels in the focused and unfocused states." Exceptions apply where the user agent draws the indicator and the author does not change it, or where neither the indicator nor its background is modified by the author.

Points that matter for design:

- Area is a minimum, not a literal 2px outline. The perimeter formula for a rounded rectangle is `4h + 4w - (16 - 4π)r`.
- Contrast is a change between the focused and unfocused states of the same pixels. A yellow ring added to a blue background counts as a blue to yellow change (the Understanding example gives 12:1).
- Only the part of the indicator that meets 3:1 counts toward the area. A 2px ring where only 1px passes fails.
- An indicator drawn inside the component and not against its outer edge must be thicker: a 2px inset line fails, and the doc says it would need to be at least 3px.
- Shadow and glow effects outside the component do not count as the component itself when working out the perimeter (Note 1). They can still be the indicator.
- Offsetting the indicator from the component is allowed and "can help make indicators more visible".
- For backgrounds that vary (images, gradients, parallax) the doc recommends C40 or a solid box with a border.

### Technique C40 (two-colour focus indicator)

Sufficient for 1.4.11, 2.4.7 and 2.4.13. Quote: "As long as the two indicator colors have a contrast ratio of at least 9:1 with each other, at least one of the two colors is guaranteed to meet 3:1 contrast with any solid background color." (My arithmetic: black against white is 21:1 and the worst-case background, mid grey, gives at least √21 ≈ 4.58:1 against one of the two.) The guarantee holds only if the whole indicator is drawn over one solid background colour and outside the component. Over images, gradients or other components a pixel check may still be needed. The page's own CSS example:

```css
:focus {
  /* inner indicator */
  outline: 2px #F9F9F9 solid;
  outline-offset: 0;
  /* outer indicator */
  box-shadow: 0 0 0 4px #193146;
}
```

Its note says avoid `outline: none` with `box-shadow` alone, because user agents commonly suppress `box-shadow` in forced-colour modes, and to pair a shadow-only style with `outline: 2px transparent solid`. The outline paints over the first 2px of the 4px shadow, so the visible result is a 2px inner band and a 2px outer band. Sources: Technique C40, Understanding 2.4.13.

### What we should hold ourselves to

- AA gate: 2.4.7, 1.4.11, 2.4.11 plus 44px targets (the framework baseline).
- Quality target: 2.4.13 (2px minimum perimeter area, 3:1 change, and 3px if drawn inset).
- Treat 2.4.13 as a design target rather than a conformance claim, since it is AAA.

## 2. The two-colour (double ring) technique in the wild

| System | What it does (as read) | Verified from |
|---|---|---|
| GOV.UK Frontend | Focus colour is a yellow with black "focus-text". Box focus: `outline: 3px solid transparent` (width is the variable `$govuk-focus-width`; value UNVERIFIED) plus `box-shadow: 0 0 0 4px <yellow>, 0 0 0 8px <black>`. Text links: yellow background, `box-shadow: 0 -2px yellow, 0 4px black`, underline removed. The transparent outline exists so forced-colours mode paints something. | `_focused.scss` and `_colours-functional.scss` in alphagov/govuk-frontend, main branch |
| Primer (GitHub, the `primer/css` repo) | `focusOutline`: `outline: 2px solid <focus colour>; outline-offset: -2px` (inset). `focusOutlineOnEmphasis` (for filled buttons): the same outline plus `box-shadow: inset 0 0 0 3px <fg-on-emphasis>`, a two-tone inset ring. Whether this is still the current Primer implementation is UNVERIFIED (read from the css repo, not Primer React). | `src/support/mixins/misc.scss` |
| Radix Themes | Solid-style buttons: `outline: 2px solid var(--focus-8); outline-offset: 2px`. Soft and ghost-style variants use `outline-offset: -1px` (inset). Single colour, no second band. | `components/_internal/base-button.css` and `button.css` |
| Adobe Spectrum | Exposes focus ring as tokens (`--spectrum-focus-ring-gap`, `-size`, `-border-radius`) with the ring separated from the control by a gap. The exact drawing technique (which property) I did not read: UNVERIFIED. | `spectrum-css-temp` button `index.css` |
| Chakra UI | `focusRing` and `focusVisibleRing` style props with three modes: `outside`, `inside`, `mixed`, plus a `focusRingColor` token settable per component or globally. Drawing CSS not read. | Chakra docs `focus-ring.mdx`, button recipe |
| Bootstrap 5.3 | Variables: `$focus-ring-width: .25rem`, `$focus-ring-opacity: .25`, colour `rgba($primary, .25)`. A 25%-opacity primary glow made from `box-shadow` (the style the owner calls a glow). Not a two-colour technique. Whether button rules also set `outline: 0` I did not confirm. | `scss/_variables.scss` and `_buttons.scss` at v5.3.3 |
| Tailwind UI, Apple | UNVERIFIED. I could not retrieve a reliable source for either in this session; do not cite them. | n/a |

W3C-endorsed generic recipe (Sara Soueidan's guide, which cites the same pattern): `outline: 3px solid black; box-shadow: 0 0 0 6px white;` on `:focus-visible`. Her guide states outlines overlap box-shadows, which is why the shadow is offset by double the outline.

In practice (from my renders): a black-and-white pair around a coloured pill reads as a crisp "sticker edge". It is high-contrast and unmistakably a focus state, but it can look utilitarian if both bands are heavy. It looks more designed when the inner band is tied to the button (the readable colour of its own face) and the bands are thin (2px each).

## 3. Techniques compared

| Technique | Follows `border-radius` | Clipped by `overflow: hidden` ancestor | Forced-colours (Windows High Contrast) | Notes |
|---|---|---|---|---|
| `outline` (positive offset) | Yes, Chrome 94, Firefox 88, Safari 16.4 (MDN browser-compat-data) | Yes (tested) | Survives; colour is replaced by a system colour | Best default. Takes no layout space. |
| `outline` (negative offset, inset) | Yes | No, stays inside the box (tested) | Survives | Needs 3px minimum for 2.4.13; can collide with text on small buttons. |
| `box-shadow` ring (spread, 0 blur) | Yes, always has | Yes (tested) | Removed: MDN says `box-shadow` is "forced to 'none'" | Only way to add a second colour band outside an outline. Always pair with a real outline. |
| `outline` + transparent colour | Yes | Yes | The transparent colour is replaced by a visible system colour (seen in my forced-colours run and stated in the GOV.UK source comment) | The standard safety net behind a shadow-only design. |
| `::after` pseudo-element ring | Only if you set radius yourself | Yes | Borders survive, shadows do not | Needs `position: relative` and `pointer-events: none`; collides with buttons that already use `::before` or `::after` (hover fills, icons). Use only when a ring needs a shape outline cannot draw. |
| Border change or background change on focus | Yes | No | Borders are forced to system colours, backgrounds are removed | Change of colour must be at least 3:1 against the old colour (Understanding 2.4.13 fig. 12 and 13). Hard to see if buttons are far apart. |

Browser support (MDN browser-compat-data 8.1.6, published 2026-10-15; I queried the data directly):

- Outline following border-radius: Chrome 94, Edge 94, Firefox 88, Safari 16.4 (and iOS Safari 16.4). Before those versions the outline stayed rectangular.
- `:focus-visible`: Chrome 86, Firefox 85, Safari 15.4.
- `:focus-within`: Chrome 60, Firefox 52, Safari 10.1. `:has()`: Chrome 105, Firefox 121, Safari 15.4.
- `forced-colors` media query: Chrome 89, Firefox 89, Safari 16. `prefers-reduced-motion`: Chrome 74, Firefox 63, Safari 10.1.
- `scroll-padding`: Chrome 69, Firefox 68, Safari 14.1. `scroll-margin`: Chrome 69, Firefox 90, Safari 14.1.

### How to make a ring look attached, not floating

1. Zero or tiny offset. The owner's complaint ("disconnected") is the 2px transparent gap of the current style. Offset 0 makes the ring touch the button.
2. Tie the inner colour to the button: the readable colour of the button's own face. A black ring on yellow and a white ring on navy reads as the button's own edge.
3. If a gap is wanted, fill it with the button's own colour using a `box-shadow` spread (design 3 below), so the button visually grows and the ring wraps that.
4. Do not use a glow (blur). It reads as soft and dated, is low contrast, and measures as no focus indicator in 2.4.13 terms.
5. `currentColor` is the button's text colour, which is usually already contrast-safe against its face: it is a valid, zero-code way to get a face-tied inset ring colour when the text colour is high contrast, but not when the text colour is deliberately mid-tone.
6. `accent-color` only themes native form controls (checkbox, radio, range, progress); it does not style button focus rings. It cannot be used for this.

## 4. The three recommended designs (tested CSS)

All three were rendered with this shared setup. The page `--sgs-focus-ink` is near-black and `--sgs-focus-paper` is white (contrast about 19:1, comfortably over the 9:1 C40 threshold). `--sgs-btn-bg` stands for the button's own background colour.

```css
.sgs-button {
  outline: 0 solid transparent; /* zero width, so nothing paints at rest, even in forced-colours */
  transition: outline-offset 140ms ease, outline-width 140ms ease, box-shadow 140ms ease;
}
@media (prefers-reduced-motion: reduce) { .sgs-button { transition: none; } }
```

Tested caveat: Chrome 155 only. I did not test the transition in Firefox or Safari.

### Design 1 (rank 1): Twin Band

A 2px ring flush against the button in the button's readable colour, with a 2px ring of the opposite colour outside it.

```css
.sgs-button {
  --sgs-ring-inner: var(--sgs-focus-ink);
  --sgs-ring-outer: var(--sgs-focus-paper);
}
@supports (color: contrast-color(red)) {
  .sgs-button {
    --sgs-ring-inner: contrast-color(var(--sgs-btn-bg));
    --sgs-ring-outer: contrast-color(var(--sgs-ring-inner));
  }
}
.sgs-button:focus-visible {
  outline: 2px solid var(--sgs-ring-inner);
  outline-offset: 0;
  box-shadow: 0 0 0 4px var(--sgs-ring-outer);
}
```

- WCAG: meets 2.4.7 and 1.4.11 and is the C40 pattern. 2.4.13: the inner band is exactly a 2px perimeter against the outer edge, and the two bands are at least 9:1 apart. Over a photograph the C40 note still applies (a pixel check may be needed), although black beside white keeps at least about 4.58:1 against every pixel through one band or the other (my arithmetic, not a W3C statement).
- Light page: the black inner band carries it; the white outer band disappears into a light page, which is harmless. Dark page: the white band carries it. Photo: whichever band contrasts shows; the pair always draws a clean outline (seen in my render).
- Same-colour risk: a yellow button on a yellow page is still clearly ringed because the ring is black.
- Forced-colours: the outline survives and is repainted in the system colour; the shadow is dropped (seen in emulation). The result is a single 2px ring, still visible.
- Weaknesses: with no gap it looks heavier and more "technical" than a gap ring. The white outer band is invisible on pale pages, so the design on light pages is effectively one black ring (still good). Pure black is stark; the token proposal below tints it.
- Look: a crisp black rim around the yellow pill with a thin white halo; a white rim with a black halo on the navy pill.

### Design 2 (rank 2): Inset Keyline

A 3px ring drawn inside the button face, 3px from the edge, in the face's readable colour. It never touches the page, so the page colour is irrelevant.

```css
.sgs-button {
  --sgs-ring-inner: var(--sgs-focus-ink);
}
@supports (color: contrast-color(red)) {
  .sgs-button { --sgs-ring-inner: contrast-color(var(--sgs-btn-bg)); }
}
.sgs-button:focus-visible {
  outline: 3px solid var(--sgs-ring-inner);
  outline-offset: -6px;
}
```

- WCAG: against the button face it gets 1.4.11 contrast (the adjacent colours are the face colours). 2.4.13: the ring sits inside, so it must be thicker than 2px; at 3px it passes the area test. Calculation for a 160 x 48px rectangle: required 4h + 4w = 832px squared; the ring covers (154 x 42) minus (148 x 36) = 1,140px squared. This is an approximation that ignores corner radii and I did not check it with a tool.
- Light, dark and photo: identical on all of them, because the ring sits over the button face only (seen in my render).
- Forced-colours: the outline survives.
- Not clipped by `overflow: hidden` ancestors (tested).
- Weaknesses: needs room (buttons under about 40px tall or with tight text padding will touch the text; I would hide this behind a minimum height of 44px, which the framework already requires). The owner disliked the "sits inside the button" look of the second candidate, so this may be rejected on taste even though it is technically strongest. A button whose face is a gradient or image has no single adjacent colour, so `contrast-color` cannot be relied on.
- Look: a thin crisp inner line, like a stitched keyline; reads as a deliberate "selected" state and is the most "designed" of the three in my renders.

### Design 3 (rank 3): Socket

The button visually grows by 3px in its own colour, then a 2px ring and a 2px halo wrap that. It is the most "connected" look because the gap is filled with the button's colour, not the page.

```css
.sgs-button {
  --sgs-ring-inner: var(--sgs-focus-ink);
  --sgs-ring-outer: var(--sgs-focus-paper);
}
@supports (color: contrast-color(red)) {
  .sgs-button {
    --sgs-ring-inner: contrast-color(var(--sgs-btn-bg));
    --sgs-ring-outer: contrast-color(var(--sgs-ring-inner));
  }
}
.sgs-button:focus-visible {
  outline: 2px solid transparent; /* forced-colours safety net */
  outline-offset: 3px;
  box-shadow:
    0 0 0 3px var(--sgs-btn-bg),
    0 0 0 5px var(--sgs-ring-inner),
    0 0 0 7px var(--sgs-ring-outer);
}
```

- WCAG: the ring is separated from the button by a gap filled with the button colour, so 1.4.11 contrast is judged against that fill (good) and the halo against the page. 2.4.13: inner band is a 2px band at offset 3px, so the perimeter area is larger than the minimum (offsetting is permitted). The same photo caveat as design 1 applies.
- Light, dark and photo: the ring (ink) and halo (paper) pair works as in design 1.
- Forced-colours: all shadows are dropped; the transparent outline is repainted as a single ring 3px from the button, floating over the gap, which is now transparent. That is the "disconnected" look in the fallback only (seen in emulation).
- Weaknesses: heaviest of the three (about 7px total growth, so it can crowd neighbouring buttons and trip `overflow: hidden` ancestors, tested), and relies on box-shadow for the connected look.
- Look: a thicker pill ringed like a double border; clearly a focus state, a bit chunky on small buttons.

### Not recommended

- Glow or blur rings (current style, Bootstrap 5.3 default): low contrast and fails the "designed, connected" brief.
- Stacked inset bars or coloured hover rings drawn with shadows (the second candidate): they stack decoration inside the button and compete with the hover state.

## 5. Token proposal

A framework-wide focus token set, each with a default derived from the button, so a client restyles in one place.

| Token | Default | Purpose |
|---|---|---|
| `--sgs-focus-width` | `2px` | Band thickness (3px for the inset design) |
| `--sgs-focus-offset` | `0` (design 1), `-6px` (design 2), `3px` (design 3) | Gap or inset |
| `--sgs-focus-ink` / `--sgs-focus-paper` | near-black and white (at least 9:1 apart) | Fallback pair when `contrast-color()` is unavailable, and the C40 pair |
| `--sgs-focus-ring-inner` | `contrast-color(var(--sgs-btn-bg))`, falling back to ink | Ring touching the button |
| `--sgs-focus-ring-outer` | `contrast-color(var(--sgs-focus-ring-inner))` | Opposite band or halo |
| `--sgs-focus-duration` | `140ms` | Transition length; `0ms` under reduced motion |
| `--sgs-focus-style` | `twin` (one of `twin`, `inset`, `socket`) | A single switch for the design, if we ship all three as named variants |

Notes on each point:

- Each button block sets `--sgs-btn-bg` to its own face colour at the component level, so every ring tracks its own button automatically.
- Radius follows automatically: `outline` follows `border-radius` in every current browser (versions above), so there is no radius token; the `box-shadow` follows too.
- Colour derivation, support as of 2026-10-15 (MDN browser-compat-data 8.1.6):
  - `contrast-color()`: Chrome 147, Firefox 146, Safari 26. It exists and ships, so the claim that it is not available is out of date. It returns only black or white; MDN warns that mid-tone backgrounds give weak contrast with either. The `@supports` fallback above covers older browsers. It is not the deprecated `color-contrast()`.
  - Relative colour syntax, for example `oklch(from var(--brand) ...)`: Chrome 122 (oklch), Firefox 128, Safari 18.
  - `color-mix()`: Chrome 111, Firefox 113, Safari 16.2. `light-dark()`: Chrome 123, Firefox 120, Safari 17.5.
  - All four syntaxes parsed as valid in my Chrome 155 test.
- Premium tweak, UNVERIFIED for contrast: tint the near-black with the brand hue instead of pure black, for example `color-mix(in oklch, contrast-color(var(--sgs-btn-bg)), var(--brand) 12%)`. Syntax parses in Chrome 155; I did not calculate resulting contrast ratios, so a contrast check (tests or a gate) must prove at least 3:1 before shipping.
- Keep the C40 rule as a validation gate: ink and paper must be at least 9:1 apart; the gate should fail otherwise.

## 6. Aesthetics: what separates premium from "browser default"

- Keep the ring 2px (designs 1 and 3) or 3px (design 2). Thicker than 3px starts to read as a heavy border.
- Follow the radius (automatic with `outline` and `box-shadow`), so a pill gets a pill ring.
- Tie the colour to the button, not to a global blue. Avoid the stock browser blue unless it is the brand.
- Transition 120 to 150ms on width, offset or shadow, so the ring appears to grow from the button, and set `transition: none` under `prefers-reduced-motion: reduce` (done in the shared setup above). Untested in Firefox and Safari.
- Do not rely on the hover state to carry focus; hover and focus should be visibly different (the owner's "weird red ring" is a hover effect leaking into focus).
- Same ring on every interactive surface (buttons, links, inputs, cards) so the effect is unified.

## 7. Pitfalls

- Ring clipped: `overflow: hidden` on an ancestor cuts an outside outline or shadow (tested: both were clipped). Use the inset design inside clipping containers, or add padding so the ring fits.
- Ring hidden under sticky headers: set `scroll-padding-top` on the scroll container, or `scroll-margin-top` on focusable elements, at least the header height plus the ring's reach (supported widely; 2.4.11 Understanding names scroll padding as a fix). Cookie banners should be modal or leave padding.
- Ring invisible on a same-colour button: a ring that equals the button's own colour only (the current yellow ring on a yellow button) has no change in contrast. Two-colour or face-contrast rings avoid this.
- `box-shadow` only, no outline: disappears in forced-colours. Always keep an outline (transparent if needed); a transparent outline is repainted in a visible system colour (seen in emulation).
- A resting `outline: transparent` with non-zero width could paint in forced-colours at rest; use zero width at rest (done in the shared setup).
- `:focus-visible` heuristics (Selectors Level 4, section 9.4): indicate focus for elements that support keyboard input (text fields), and when the user is using the keyboard; do not indicate it for pointer clicks on elements that do not take keyboard input; if script moves focus and the previous element showed focus, the new one should too; a newly shown element that auto-focuses (such as a dialog button) should show it. User agents should also use `:focus-visible` for the default style. Scripted focus after a mouse click may therefore show no ring. SC 2.4.7 only requires one mode of operation (keyboard) to be visible.
- `:focus-within`: for composite widgets (a card containing a link) it can highlight the container; combine it carefully, because it also matches after a mouse click. `:has(:focus-visible)` (Chrome 105, Firefox 121, Safari 15.4) targets the container only for keyboard focus.
- Specificity and `!important` fights in WordPress: the block editor's `theme.json` supports `:hover`, `:focus` and `:focus-visible` pseudo-selectors on elements (WordPress block editor handbook, global settings and styles). Theme or core styles of the form `.wp-block-button__link:focus` can out-rank a low-specificity rule. I did not audit this repo's current cascade. Keep the framework rule in one place, give it `:where()`-based low specificity for client overrides, and avoid `!important` unless a gate proves a specific conflict.
- Multi-line inline links: `outline` draws around each line fragment and satisfies the "perimeter" test; `border` splits across fragments (Understanding 2.4.13). GOV.UK adds `box-decoration-break: clone` to fix a Chromium 108 to 111 bug for its link style (comment in `_focused.scss`).
- Overlays and blur: semi-transparent overlays above a focused item can still fail 1.4.11 even though 2.4.11 passes (Understanding 2.4.11).

## 8. Open items and unverified points

- Tailwind UI and Apple focus styles: UNVERIFIED, not cited.
- Spectrum and Chakra: the drawing CSS was not read; only token names or style-prop modes were verified.
- Primer: read from the older `primer/css` repo; whether current Primer React uses the same values is UNVERIFIED.
- GOV.UK yellow hex and `$govuk-focus-width` value: UNVERIFIED (names and structure verified).
- The Inset Keyline 2.4.13 area calculation is an approximation that ignores corner radii.
- Transition behaviour in Firefox and Safari, and real Windows High Contrast (as opposed to Chrome's forced-colours emulation): untested.
- This repo's own button focus CSS and WordPress specificity: not audited, per the read-only scope.

## Sources (all read 2026-10-17)

- W3C, Understanding SC 2.4.13 Focus Appearance: https://www.w3.org/WAI/WCAG22/Understanding/focus-appearance.html
- W3C, Understanding SC 2.4.11 Focus Not Obscured (Minimum): https://www.w3.org/WAI/WCAG22/Understanding/focus-not-obscured-minimum.html
- W3C, Understanding SC 2.4.7 Focus Visible: https://www.w3.org/WAI/WCAG22/Understanding/focus-visible.html
- W3C, Technique C40 two-colour focus indicator (page dated updated 12 January 2026): https://www.w3.org/WAI/WCAG22/Techniques/css/C40
- W3C, Selectors Level 4 (`:focus-visible`, section 9.4): https://www.w3.org/TR/selectors-4/
- W3C, CSS Color Level 5 (contrast-color, light-dark): https://www.w3.org/TR/css-color-5/
- MDN, outline, outline-offset, `:focus-visible`, forced-colors, forced-color-adjust, contrast-color(), color-mix(), light-dark(), relative colours, scroll-padding (pages fetched; "last modified" for outline-offset: 20 April 2026): https://developer.mozilla.org/en-US/docs/Web/CSS/outline-offset and sibling pages
- MDN browser-compat-data 8.1.6 (timestamp 2026-10-15), JSON queried directly: https://cdn.jsdelivr.net/npm/@mdn/browser-compat-data/data.json
- Sara Soueidan, A guide to designing accessible, WCAG-compliant focus indicators: https://www.sarasoueidan.com/blog/focus-indicators/
- GOV.UK Frontend source: https://github.com/alphagov/govuk-frontend/blob/main/packages/govuk-frontend/src/govuk/helpers/_focused.scss and `settings/_colours-functional.scss`
- Radix Themes source: https://github.com/radix-ui/themes/tree/main/packages/radix-ui-themes/src/components (`_internal/base-button.css`, `button.css`)
- Primer CSS source: https://github.com/primer/css/blob/main/src/support/mixins/misc.scss
- Adobe React Spectrum CSS source: https://github.com/adobe/react-spectrum (spectrum-css-temp button `index.css`)
- Chakra UI docs: https://github.com/chakra-ui/chakra-ui/blob/main/apps/www/content/docs/styling/focus-ring.mdx
- Bootstrap 5.3.3 source: https://github.com/twbs/bootstrap/blob/v5.3.3/scss/_variables.scss and `_buttons.scss`
- WordPress block editor handbook, global settings and styles (element pseudo-selectors): https://developer.wordpress.org/block-editor/how-to-guides/themes/global-settings-and-styles/
- Own tests: Chrome 155.0.8059.82 via Playwright, designs rendered on three backgrounds, forced-colours emulation, and an `overflow: hidden` clipping test (scratchpad only, not in the repo).
