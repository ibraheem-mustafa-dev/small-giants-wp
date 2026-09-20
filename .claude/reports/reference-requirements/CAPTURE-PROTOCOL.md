---
doc_type: protocol
project: small-giants-wp
plan_rows: W3B-2, W3B-3, W3B-3a
---

# Reference requirements table — capture protocol

Every agent capturing a reference follows this file exactly. The plan section is
`.claude/plans/2026-07-29-merged-spec36-37-track-strategic-plan.md` under "Wave 3B — Reference
deconstruction". Read that section first: it holds the 14 columns and the rules for every cell.

## Output (one reference = two files, nothing else in the repo)

- `.claude/reports/reference-requirements/<reference>.json`
- `.claude/reports/reference-requirements/<reference>.md` — a one-page summary a person can read:
  what the header, bar, panels, trigger/close, drawer and footer are, what surprised you, what could
  not be measured and why.

`<reference>` is one of: studionamma, buck, dogstudio, fantasy, lamalama, lusion, wearecollins, resn,
away, butcherbox, rabbit, halcyon, indus-foods.

## JSON shape

```json
{
  "reference": "lamalama",
  "url": "https://lamalama.com/",
  "captured": "2026-09-20",
  "browser": "Chrome, headed, Playwright",
  "rows": [
    {
      "surface": "header-shell",
      "tier": 1440,
      "presence": "present",
      "cells": {
        "archetype":   { "value": "floating-pill", "method": "static", "evidence": { "script": "name", "selector": "css", "raw": { } } },
        "geometry":    { "value": {}, "method": "static", "evidence": {} }
      }
    }
  ],
  "not_measured": [ { "surface": "footer", "tier": 375, "column": "motion", "reason": "why" } ]
}
```

- `surface` is one of: `header-shell`, `bar`, `dropdown`, `mega`, `trigger-close`, `drawer`, `footer`.
- `tier` is 375, 768 or 1440 (viewport widths, height 900).
- `presence` is decided by what a VISITOR sees, never by an HTML tag: a header exists when the top edge shows a logo or home control, a menu control, or a nav, even if no `<header>` element or container holds them (record such a header as shell-less, with each part measured). `absent` means the visitor sees no such thing.
- `presence` is `present`, `absent` or `not-applicable`. An `absent` row still has its row and a one-line
  reason in its `archetype` cell. Never invent a value for a surface the site does not have.
- `cells` keys are the column names: `archetype`, `geometry`, `zone_model`, `ground`,
  `background_visual`, `item_typography`, `item_states`, `secondary_blocks`, `trigger_close`,
  `mechanics`, `motion`, `content`, `tier_delta`. Column 14 (SGS coverage) is NOT filled here.
- Every cell is `{ value, method, evidence }`. `method` is `static` (computed style or rect on the
  rendered DOM), `interaction-capture` (you drove the page: hover, click, scroll, wait, diff), or
  `source-only` (read from the site's code because driving the page could not show it). `evidence`
  names the script or command, the selector, and the raw numbers or quoted lines that produced the
  value. A cell without evidence is invalid.
- A cell you could not fill is not left blank and not guessed: put it in `not_measured` with the
  reason (for example "trigger unreachable headlessly", "requires login").

## Browser: real and headed, never headless

Capture in a real, visible Chrome on this PC: `chromium.launch({ channel: 'chrome', headless: false })`
(fall back to the bundled Chromium with `headless: false` only if Chrome is not installed, and say so),
with the GPU enabled. Do not use a headless browser. Headless runs software rendering (one frame a second
on lusion, twelve on resn), a "HeadlessChrome" user agent that some sites answer differently, overlay
scrollbars that change the usable width, and it blocked real pointer input on resn at 768. Record in every
row `viewport` (`innerWidth`) and `clientWidth` (`document.documentElement.clientWidth`), and derive every
width, centring and anchor label from `clientWidth`, because a classic scrollbar takes about 15px. Run one
headed browser at a time so windows do not fight for the screen.

**One browser for the whole job, opened once.** Start Chrome once in a long-running process
(`chromium.launchServer({ channel: 'chrome', headless: false })`), write its `wsEndpoint` to a file, and
have every script connect to it (`chromium.connect(wsEndpoint)`). Reuse one page per site, resize that page
between tiers instead of reloading, and never call `browser.close()` until the job is finished. Wait for
each site to finish loading (load event, network idle, preloader and consent gate gone, then two seconds
of quiet) before measuring. Windows opening and closing on the owner's screen for every script is a
defect in the capture, not a method.

## Rules for values (from the plan)

- Derive labels from numbers: `header width == viewport` → full-bleed; narrower with equal left and
  right inset → capped (record px); with a radius and a top inset → floating. Panel anchor:
  `|panelCentreX − itemCentreX| ≤ 2px` → item-centred; `|panelLeft − itemLeft| ≤ 2px` → item-left;
  `panelWidth ≥ headerWidth − 2px` → header-wide; a fixed width centred on the header or viewport →
  capped-centred (record px and whether it differs per panel). Centred on the viewport:
  `|surfaceCentreX − viewportCentreX| ≤ 2px`.
- Colours as hex (or rgba with alpha), sizes as px.
- Appearance is more than `backgroundColor`: record `backgroundImage`, `filter`, `backdropFilter`,
  `mixBlendMode`, `opacity`, the `::before` and `::after` pseudo-elements, and any translucent overlay
  above the element. A "match" on colour alone is not a measurement of what is painted.
- Behaviour cells are captured by driving the page: hover an item, wait 600ms, diff computed styles;
  scroll 600px, diff the header; open a panel, measure it against the header box and the trigger; press
  Escape, check focus and close. Sites with Lenis or custom scroll need the real scroll container.
- Text not present as DOM text (a canvas) is recorded as such.

## Method notes carried from the earlier measurement run

- The scripts in `C:\Users\Bean\AppData\Local\Temp\claude\c--Users-Bean-Projects-small-giants-wp\e8121ea1-eebb-401c-ab36-bff8fbb20661\scratchpad`
  (`pill-probe.mjs`, `openpanel.mjs`, `kids.mjs`, `scroll2.mjs`, `inspect.mjs`) worked against these sites
  and may be copied and adapted into YOUR OWN scratchpad. Read `.claude/reports/2026-09-20-w2p-reference-pill-measurements.md`
  §1 for how they load Playwright (`createRequire` against `plugins/sgs-blocks/package.json`).
- URLs: studionamma.com, buck.co, dogstudio.co, fantasy.co, lamalama.com, lusion.co,
  wearecollins.com, resn.co.nz, https://www.awaytravel.com/, https://www.butcherbox.com/, rabbit.tech.
- Consent gates: buck "Got it", dogstudio (at 390) "Accept", fantasy "Accept all", lamalama "OK", away
  "Accept". dogstudio serves an out-of-date-browser banner that shifts offsets by about 81px; record it.
  lusion and lamalama scroll through Lenis; lusion's scroll was not measured last time.
- Existing drawer data to cross-check (not to copy): `.claude/reports/2026-07-28-drawer-code-extraction/`
  (`<site>-desktop.json`, `<site>-mobile.json`, `labels-<site>.json`, `DIFF-ANALYSIS.md`). Disagreement
  between your capture and that data is a finding: record both and say which you trust and why.

## What you must not do

- Do not edit any file outside `.claude/reports/reference-requirements/` and your own scratchpad.
- Do not commit, deploy, or use git stash.
- Do not read a value from a screenshot or a class name: every value comes from a rect, a computed
  style, or a quoted line of code.
- Do not fill a cell to make the table look complete.
- Report at the end: which rows and columns are filled, which are in `not_measured`, and the exact
  commands to re-run your capture.
