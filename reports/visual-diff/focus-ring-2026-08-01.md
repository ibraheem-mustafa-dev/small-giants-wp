# D454 focus-ring opacity fix — verification report

**Date:** 2026-08-01
**Mode:** Maintenance (verification-only, read-only on source, no deploy performed)
**Scope:** `.sgs-form-field__input:focus-visible` in `plugins/sgs-blocks/src/blocks/form/style.css`

## Headline finding — the fix is real, but not where the task said it was

The task stated "the fix below is DEPLOYED to the canary." **That was true only for `sandybrown-nightingale-600381.hostingersite.com`, not for `palestine-lives.org`.**

- `palestine-lives.org` build file `wp-content/plugins/sgs-blocks/build/blocks/form/style-index.css` is dated **22 Jul**, and still carries the OLD buggy rule verbatim: `opacity:var(--sgs-focus-ring-opacity,1)` on `.sgs-form-field__input:focus-visible`. Verified by reading the file directly over SSH (not a CDN/cache artefact — checked the on-disk file, not just a curl response).
- `sandybrown-nightingale-600381.hostingersite.com`'s build of the same file is dated **1 Aug 20:20** and carries the fixed rule: `outline:...solid color-mix(in srgb, var(--sgs-focus-ring-colour,...) calc(var(--sgs-focus-ring-opacity,1)*100%), transparent)`.

I built my first test page on `palestine-lives.org` (page ID 364, `/focus-ring-qa-d454/`) before noticing this, confirmed the CSS there was stale, then rebuilt the fixture on sandybrown (page ID 2118, `https://sandybrown-nightingale-600381.hostingersite.com/focus-ring-qa-d454/`) — all measurements below are from sandybrown. **Both test pages are left live** for audit trail; neither was written to via `wp post update`.

If `palestine-lives.org` is meant to have this fix too, it needs a real deploy — it does not have it right now, D454 or not.

## Test fixture

Two `sgs/form` instances, one `sgs/form-field-text` each:
- Form A: `formFocusRingOpacity` unset → **defaults to 40** (`block.json` default is 40, so this is already the non-default/buggy-in-the-old-code case the task asked me to build — no extra attribute needed)
- Form B: `formFocusRingOpacity: 100` (control instance)

## Negative control (per protocol, before trusting any pixel reading)

Sampled `<h1>` text colour via a cropped element screenshot and compared to `getComputedStyle`: pixel read `(230,138,149)` against computed `rgb(230,138,149)` — exact match. Pixel pipeline is trustworthy.

## A real capture bug hit and resolved mid-session (worth recording)

Element-level screenshots (`locator.screenshot()`) of the second form field consistently and reproducibly captured the WRONG region — the heading two rows above the field, not the field itself — even after forcing an instant scroll and disabling `scroll-behavior: smooth` (this site's theme sets `html { scroll-behavior: smooth }` site-wide). Neither intervention fixed it, which ruled out "mid-animation" as the sole cause. Switched to full-page screenshots + coordinate-based PIL cropping instead, which also initially mismatched by ~25–50px against `getBoundingClientRect()` maths for reasons I did not fully chase down (this canary's known DPR-1.1/sticky-header capture quirk, flagged in the task brief, reproduced again here). Resolved by locating the actual input borders programmatically (scanning for long horizontal non-background pixel runs) rather than trusting coordinate arithmetic, then verifying visually with zoomed crops. This cost most of the tool budget on this task — flagging it because it will recur for the next agent that assumes `getBoundingClientRect()` + full-page-screenshot coordinates are interchangeable on this site.

## Measurements (on sandybrown, with the real D454 fix live)

### 1. Field is not dimmed (the actual bug being fixed)

`getComputedStyle` on the input element, focused vs unfocused, at 40% ring opacity:

| Property | Unfocused | Focused |
|---|---|---|
| `color` | `rgb(58,46,38)` | `rgb(58,46,38)` |
| `background-color` | `rgb(251,243,220)` | `rgb(251,243,220)` |
| `opacity` | `1` | `1` |

Identical in both states — the fix has genuinely removed the whole-element `opacity` decl. This is the core claim and it holds.

### 2. Ring visibly dims to the configured opacity — pixel-verified

Cropped and colour-sampled the rendered outline against the page background (cream `(251,243,220)`), for both instances while focused:

| Instance | Outline pixel colour (measured) | Theoretical `color-mix` blend | Match |
|---|---|---|---|
| 40% ring | `(243,201,192)` | `0.4×(230,138,149) + 0.6×(251,243,220) = (243,201,192)` | **Exact** |
| 100% ring | `(230,138,149)` (fully saturated, no dilution) | `(230,138,149)` | **Exact** |

`getComputedStyle(...).outlineColor` corroborates this precisely:
- 40%: `color(srgb 0.901961 0.541176 0.584314 / 0.4)` — alpha 0.4
- 100%: `color(srgb 0.901961 0.541176 0.584314)` — no alpha component (fully opaque)

The ring visibly and measurably dims to the configured percentage. Confirmed both by direct pixel sampling and by the resolved computed-style value.

### 3. Typed text renders at full strength while focused

Typed "Test typing" into the 40%-ring field while it was focused, then pixel-sampled the rendered glyph colour directly from the screenshot (not `getComputedStyle`, which only tells you the declared value, not what got painted): measured `(58,46,38)`, exact match to the computed `color`. Contrast of typed text against the field background:

**11.86:1** — comfortably above the 4.5:1 AA minimum, and unchanged whether the field is focused or not (same computed colour pair in both states, per §1).

This is the headline regression check: before the fix, this same scenario measured ~1.79:1 (per the task's own account of the original bug). It is nowhere near that now.

### 4. Default (100%) instance still shows a fully opaque ring

Confirmed twice: `outlineColor` alpha component absent (`color(srgb ... )`, no `/ N`) and the pixel-sampled ring colour is the unmixed brand primary `(230,138,149)` with zero dilution toward the background.

### 5. `color-mix` browser support — resolves correctly, no regression

Test browser: Chrome 150 (Playwright-bundled Chromium). `getComputedStyle(...).outlineColor` returned a fully resolved `color(srgb ...)` value in both cases, and `outlineStyle` computed to `solid` in both cases — **not** `none`. If `color-mix()` had failed to parse, the entire `outline` shorthand declaration would have been dropped by the CSS parser (invalid single declarations are dropped whole) and `outlineStyle` would compute to `none`. It did not. **No regression — the ring never disappears.**

`color-mix()` has been supported in Chromium since version 111 (2023); Chrome 150 supports it natively, so this result is expected, not a coincidence, but it was verified rather than assumed.

## Findings not in scope for this fix, reported for honesty

1. **`palestine-lives.org` does not have this fix deployed** (see headline finding). This is the most actionable item — if that site is meant to be current, it needs deploying.
2. **Border-colour cascade quirk (pre-existing, unrelated to D454):** while a field is both `:focus-visible` and `:user-valid` (has content, no validation errors), the `border-color` shows the success-green `(46,125,79)`, not the focus-ring pink, once `:user-valid` activates (which in this Chromium build only takes effect after the field has been blurred once, not on the very first focus). This is a source-order cascade issue between the `:focus-visible` border-color rule and the later `:user-valid` border-color rule in the same file (equal specificity, later rule wins) — nothing to do with the D454 change, which only touched the `outline` property, but flagging it because it's a real, visible interaction I found while testing. Does not affect the ring/outline itself, which stayed pink and correctly alpha-scaled throughout.
3. **The ring itself is a fairly weak focus indicator even at 100% opacity** — brand primary `(230,138,149)` against the page's cream background measures only **2.25:1**, below the WCAG 2.2 SC 1.4.11 (non-text contrast) 3:1 minimum for focus indicators. At 40% (the block's own default) it drops to **1.36:1** — essentially invisible as a standalone indicator. This is separate from the opacity-dimming bug D454 fixed (which was about the FIELD's contrast, not the ring's own contrast against its background) but is worth a follow-up: the ring's contrast against the page background never met AA at any opacity setting on this colour token, including the pre-D454 baseline. Not something I've fixed here — flagging for a decision on whether the default focus-ring colour/opacity combination needs revisiting.

## Unverified / not checked

- Not tested in a non-Chromium engine (no Firefox/Safari available in this environment) — `color-mix()` support elsewhere was not independently re-verified here, only cited from known browser support tables.
- Did not test the `:focus:not(:focus-visible)` fallback rule (style.css lines 196-200) — that rule was untouched by D454 and still carries no opacity fallback issue (it never had one), so it was out of scope, but I have not measured it directly this session.
- Did not check keyboard-only Tab-key focus (used `.focus()` calls and `fill()`, not real Tab traversal) — `:focus-visible` matched `true` in all cases tested, so the distinction shouldn't matter here, but a real Tab-key pass was not run.

## Test artefacts

- `palestine-lives.org` page ID 364 — `/focus-ring-qa-d454/` (stale-CSS site, left live for reference)
- `sandybrown-nightingale-600381.hostingersite.com` page ID 2118 — `/focus-ring-qa-d454/` (correct fix, all measurements above are from this page)
