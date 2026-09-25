# U-15 design: the self-changing header message (Wave 3C lane C)

Status: design (no Bean sign-off needed; Bean judges the built result by eye). Governing: `.claude/plans/2026-09-21-wave-3c-implementation-plan.md` §4 (U-15 row), §5 step 7 (WCAG 2.2.2); family M-07.

## 1. Problem

`sgs/notice-banner` shows one message (an `sgs/text` inner block). Three references change the message by themselves: away rotates four slides, each with its own bar colours, with previous and next arrows; lamalama picks one line at random per page load; studionamma rotates city names with a live clock.

## 2. Exit cells (M-07; values read from each `<ref>.json::rows[].cells`)

| Ref | Surface / tier | Cell (column: value) | Expressed by |
|---|---|---|---|
| away | header-shell / all | motion: four slides, time-driven | `messageMode: rotate`, four `sgs/notice-message` children |
| away | header-shell / all | ground: bar fill per slide #111111, #d85358, #39614c; text #ffffff | each message's `backgroundColour` / `textColour` |
| away | header-shell / all | secondary_blocks: previous / next arrows 36×36 | `showMessageArrows: true` |
| away | header-shell / all | item_typography: 12px / 400 / underline / #ffffff | the message's `sgs/text` typography |
| away | header-shell / 375 | 40.8px bar, the message wraps to two lines | natural wrapping, no fixed height |
| lamalama | bar / all | content: one random line of eight per page load | `messageMode: random`, eight children |
| lamalama | bar / all | motion: mono text reveal | `messageTransition: slide-up` (the closest; recorded divergence) |
| lamalama | bar / all | 10px / 500 / uppercase / #f9f4eb | the message's `sgs/text` typography |
| studionamma | bar / 768, 1440 | "PARIS, FRANCE" + "19:48:38", rotating through four cities | `messageMode: rotate`, four children, each an `sgs/local-time` (label, zone, h23, seconds) |
| studionamma | bar / 375 | strip hidden | the device-visibility extension (`sgsHideOnMobile`) on the banner |

Not measured by the references: away's interval and transition (evidence thin). `rotateInterval` 5 s and `fade` are free choices, recorded as such. Not built here: lamalama's bar that is empty until the first scroll at 375, which is header-behaviour territory (lane B, U-13); named as residue.

## 3. Design

### 3.1 `sgs/notice-message` (new child block)

`parent: ["sgs/notice-banner"]`. InnerBlocks with no template lock (text, button, icon, `sgs/local-time`); a starter template of one `sgs/text` applies only on insert. Attributes: `backgroundColour`, `backgroundColourGradient`, `textColour`, `textColourGradient` (SgsColourPanel rows), `label` (string, "": an editor-only name shown in the list view, never rendered). Render: `<div class="sgs-notice-message {uid}" data-sgs-message>{content}</div>`.

Colour: the message's scoped `<style>` paints the WHOLE bar while it is active: `.wp-block-sgs-notice-banner:has(.{uid}.is-active){background:…;color:…}`, plus `.{uid}{color:…}` so stacked no-JS messages each carry their own text colour. One `:has()` level only (a `:has()` nested inside `:has()` is invalid CSS and silently dropped). Messages without colours inherit the banner's.

### 3.2 New attributes on `sgs/notice-banner`

| Attribute | Type | Default | Control |
|---|---|---|---|
| `messageMode` | enum `static` / `rotate` / `random` | `static` | ToggleGroupControl |
| `rotateInterval` | number, seconds, 2 to 30 | 5 | RangeControl (rotate only) |
| `messageTransition` | enum `none` / `fade` / `slide-up` / `slide-left` | `fade` | SelectControl |
| `showMessageArrows` | boolean | false | ToggleControl (rotate only) |
| `pauseOnHover` | boolean | true | ToggleControl (rotate only) |
| `arrowColour`, `arrowColourHover` | string | "" | SgsColourPanel rows |

`allowedBlocks` is not set (the banner keeps accepting any content). The inspector shows the rotation panel only when the banner has two or more `sgs/notice-message` children, and a notice "Add two or more Message blocks to rotate" otherwise.

### 3.3 Render and behaviour

- `static`, or fewer than two message children: the output is byte-identical to today (a test compares it against the pre-change render of the same attributes and content).
- `rotate` / `random` add `data-wp-interactive="sgs/notice-banner"` context {mode, interval, transition, pauseOnHover, count} to the existing root and wrap `$content` in `<div class="sgs-notice-banner__messages" aria-live="off">`. CSS (only once `.is-enhanced` is on the root) stacks messages in one grid cell (`grid-area: 1 / 1`) and shows only `.is-active`, so the bar never jumps in height (the tallest message sets it).
- No JS: every message shows, stacked (degrade to more content, never less).
- `rotate`: an Interactivity timer advances `is-active` every `rotateInterval` seconds.
  - A visible pause/play `<button class="sgs-notice-banner__pause" aria-pressed="false" aria-label="Pause announcements">` (44px target) always renders in rotate mode (WCAG 2.2.2: moving content over 5 s that starts automatically needs a pause).
  - Hover (when `pauseOnHover`) and focus within the banner pause it; leaving resumes it unless the button is pressed.
  - The region is `aria-live="off"` while playing and `polite` while paused or when an arrow is used, so screen-reader users are not interrupted every 5 s (the WAI carousel pattern).
  - Arrows: `<button class="sgs-notice-banner__prev|__next" aria-label="Previous / Next announcement">`, 36×36 visual inside a 44×44 hit area; they also pause auto-rotation.
  - The timer stops while `document.hidden`.
- `random`: on init one message index is chosen with `Math.random()` (client-side, so the page cache cannot freeze it), no timer and no pause button.
- Transitions: CSS classes on the message (`opacity` for fade, `translate` for the slides), 300 ms, instant under `prefers-reduced-motion: reduce`. Rotation itself continues under reduced motion (it is content change, not motion), and the pause button stays.
- Dismiss (existing) keeps working; its storage key hash covers `$content`, so it is unchanged for a static banner.
- The live clock: an `sgs/local-time` inside a message ticks on its own; it has no `aria-live`, and the rotating region's `aria-live="off"` keeps it silent.

### 3.4 Tests (`plugins/sgs-blocks/tests/php/run-notice-message-standalone.php`)

- Static-mode output identical to the pre-change render for a banner with one `sgs/text` child.
- Rotate mode renders the pause button with `aria-pressed="false"` and the messages wrapper with `aria-live="off"`.
- Random mode renders no pause button.
- A message's scoped CSS contains exactly one `:has(`.
- An off-enum `messageMode` falls back to `static`.
- Negative control: with the pause button removed from the render, the rotate test goes red.

## 4. Risks

1. `:has()` support: Safari 15.4+ and Chrome 105+, above the theme's Safari 15 floor. Below that the bar keeps the banner's own colour and each message keeps its own text colour: acceptable degradation.
2. The existing pre-paint dismiss script sits inside the root. Its placement is unchanged.
3. Away's interval and transition are unmeasured: recorded as a free choice, not a claimed match.
