# round1

### Draft-source analyst
**Draft-source analyst: what the draft's source adds, and what holds for any client**

**Summary.** The source is worth using, but not in the way it first looks. Most of what it "declares" is already readable from the rendered draft. Three things are new. The template knows which element came from which line of the design, which elements are copies of one repeated design, and which spacing values are one shared setting. Those three facts go at false-positive patterns 2 and 6, at the Spec 47 §3.8 decision, and at the hand-written draft finders. The manifest and the Gap Map only exist because this draft was authored for SGS, so nothing should depend on them.

### 1. How the draft is read today
- The walker opens the **rendered, hosted draft** (`surfaces.json::draftUrl` = mintcream-lyrebird) through Playwright and never reads template source. PROVEN: grepping `scripts/computed-route` and `scripts/parity` for `sc-for|style-hover|x-dc|sgs-manifest` finds nothing. Only the older Python theme extractor parses the template (`theme-extractor/usage_census.py`, `shared_utils.py::_DSL_DRAFT_RE`).
- **The hosted draft is not the Gap Handoff version.** It has no manifest and no `sgs-` classes. PROVEN: `curl` of the draft URL gives `data-sgs-manifest` = 0 and `class="sgs-` = 0. The walker configs agree: `home.mjs` says "the draft has no class names" and finds elements by their text.
- **The template travels inside the hosted bundle anyway.** PROVEN: it sits in `<script type="__bundler/template">` with 78 `sc-for` tags and 64 `style-hover` attributes. So no separate source folder is needed for any Claude Design export.
- Our DevTools read already sees inline declarations (`devtools.mjs::declaredValues` reads `matched.inlineStyle`), but only for 8 sizing properties (`DECLARED_PROPS`). PROVEN.
- **Hover styles are already visible on the rendered page.** The runtime turns each `style-hover` into a real `.scpN:hover{…!important}` stylesheet rule (`support.js::createPseudoSheet`, PROVEN). The existing forced-hover read sees them, so the source adds nothing for hover values.

### 2. Each element can be tagged with its source line (proven feasible)
- **Probe.** A read-only Playwright `addInitScript` stamps `data-src=<template node index>` on every element inside `<x-dc>` at DOMContentLoaded. The DC runtime passes `data-*` attributes through to the rendered page (`support.js::collectProps`).
- **Result on the hosted draft:** 498 of 873 visible elements tagged, 213 distinct template nodes, 33 of them repeated (those are loop copies).
- **Result on the local Gap Handoff file:** 432 of 574 tagged.
- Command: `node scratchpad/probe/stamp.mjs <url>`. PROVEN.
- **The untagged rest** is most likely the `dc-import` Frame Card (a separate template) and the runtime's own chrome. ASSUMED. Stamping imported templates the same way should close most of it.

This gives every draft element an identity that does not depend on its text. What that buys:
- **Repeated groups (`sc-for`, 39 loops).** Elements sharing a template id are identical by construction for every static declaration. The template also says which properties vary per item (`{{ c.hex }}`). Two uses:
  - It answers REPORT §7 item 6 (the §3.8 ancestor hop) with evidence instead of a judgement call. Allow the parent write only when every child it reaches comes from one loop body and the property is static there.
  - It replaces the hand-written "one representative card" finders (`home.mjs::bcard`, `numTile`, `stile`).
- **Shared values (`{{ }}`, 145 style attributes use one).** `padding: {{ secPad }}` is on 7 sections. The rendered page shows seven equal paddings; only the source shows they are one setting. Rows on secPad-bound elements should become one site-level fix (container default or style variation), not seven block writes.
- **Breakpoints.** The logic class gives step values (`secPad: mobile ? '56px 20px' : '104px 52px'`). The manifest adds non-standard breakpoints (1060, 1160, 1280, 1100, 620). Those tell the walker exactly which widths to test.
- **Hidden states (`sc-if`, 87 conditionals, e.g. `megaBrands`, `navCompact`).** Together they list every state the draft can be in. Diffing that list against each config's `states` shows which states nobody walks.

### 3. Pattern by pattern

| Problem | Would source data prevent it? | How, and what it replaces |
|---|---|---|
| 1 Paints nothing (7px gap on a one-child link) | Partly, and the useful part is universal | The draft link declares no gap at all (source line 1626: `style="color:#5E584F"`). The rendered draft shows the same via `inlineStyle`. Proposal: on the draft side, read declared-ness for every property, not just the 8. Then the "paints nothing" acceptance holds only when **the draft declares nothing AND the geometry has settled**. This tightens the over-generous rule (ba31e5157, REPORT §7 item 1); it is not a second rule. |
| 2 Two different elements paired | Yes, the biggest win | Draft side: if the draft element is a leaf inside a loop body (the "Ray-Ban" label) and the live element is the loop item's root (the whole card), the pair is wrong. Needs nothing new on the live side. Long term: record the draft template id on each tree node at authoring time (trees carry only `_key` today, PROVEN), so pairing becomes identity: template id → tree node → live `cr-ref`. This is an input to auto-align, not a second pairing system. |
| 3 Child's value blamed on the parent | No | A live-side labelling bug; the prepared `walker-decoration` fix is the right layer. |
| 4 Repeated per enclosing block | Already fixed | — |
| 5 Knock-on shifts | No | A geometry/ledger question; the template does not help. |
| 6 Draft side blank (45 rows) | Probably | If a blank draft element sits in an `sc-if` branch, it exists only in a state that was not walked (the state is named in the source). If it has no template node, it is genuinely absent from the draft. ASSUMED: none of the 45 rows was checked. |
| Doubled card padding (home) | No | The draft's layer is already visible in the rendered page. The fault is live-side: a lower box already carries the padding. That needs a live-side "a descendant already has it" check, or the in-browser trial, which would show contents narrowing by 44px. |
| Header and mega-brands mispairs | Yes | Same as pattern 2. On manifest drafts, `sgs-header` sits on the real `<header>`. |
| Guard repeating trials | No | — |

### 4. How standard is the format?
- **The runtime is identical across all three handoffs.** PROVEN: `diff` of v1, v2 and Gap `support.js` shows 0 lines different. Usage is the same too: 78 `sc-for` tags, 64 `style-hover`, about 830 inline styles in each.
- **The manifest and the 40 `sgs-` classes first appear in v2.** v1 has neither (PROVEN). They are an SGS authoring request, not part of the format.
- **The manifest is not reliable as section boundaries.** `sgs-best-sellers` and `sgs-shape-tiles` sit on the heading wrapper `<div>`, not the `<section>` (PROVEN at source line 699). Every listed class does exist, once each.
- **`behaviouralRules` is prose.** Good material for `divergences.json` (for example "the Google panel is deliberately off-brand"), but not machine-actionable.

Three tiers, and nothing should be built on the top one:
1. **Any HTML draft (universal):** the rendered page, declared values through DevTools for all properties, `:hover` rules, media-query breakpoints from stylesheets, and CSS custom properties as token hints. A hand-coded or exported draft with no template still gets an approximation of repeated groups: sibling subtrees with identical tag and declaration signatures.
2. **Any Claude Design export (the template is inside the bundle):** source-line tags, loops, conditionals, shared values, breakpoint flags.
3. **SGS-contract drafts only:** manifest, section names, routes, live-data vs fixed-list notes, behaviour prose. Use it only to confirm tiers 1 and 2, never as the only source.

### 5. The Gap Map as an answer key for triage's "framework gap" label
It is not a key. Four reasons:
- **Different granularity.** Its 110 items are features described in prose, graded 0–5 (`ROWS = R(area, item, exists, grade, fix, size)`). Triage's F label asks whether any setting on this block reaches this property (`triage.mjs` header). You cannot map 1,613 property rows onto 110 prose items.
- **Unverified.** The design tool wrote it about the repo, with no DB check.
- **Stale.** It is dated 24 Sep, and work since then has already closed items (for example `517cc7235`, the drawer social row).
- **This client only.** Another client will not have one.

Where it does help:
1. **Grouping.** Attach F rows to a named build item, so Bean reads "trust-bar overflowMode: drop" rather than 40 rows.
2. **Spotting disagreements.** An F row inside an item graded 0 ("works today") or 1 ("configure") should be audited first as a likely route gap or mispair. A Solve row on a feature graded 4 ("new block") that does not exist yet should be parked, not written.

### 6. Recommended order (each step is small)
1. Stamp source-line ids on the draft side through `addInitScript`, read-only (tier 2). Keep the stamping inside the walker's draft page only.
2. Extend draft-side declared-ness to every property, and use it to tighten the "paints nothing" rule (REPORT §7 item 1).
3. Add the loop-body check to triage and to Solve's write step (REPORT §7 item 2, now with evidence).
4. Use loop uniformity as the evidence for the §3.8 ancestor-hop decision.
5. Later: record the template id on tree nodes at authoring time, and replace the per-surface text finders.

Nothing in the repo was changed. The only files created are in the scratchpad: `C:/Users/Bean/AppData/Local/Temp/claude/c--Users-Bean-Projects-small-giants-wp/a312603f-36e7-40a1-8bd1-5977270c6bfc/scratchpad/probe/stamp.mjs` and `.../scratchpad/draft-live.html`.

### Playwright researcher
**Playwright researcher: what Playwright can add to the clone checker**

**First, a correction to the premise: this is not Playwright versus DevTools.** Playwright is the remote control that drives the browser. The Chrome DevTools Protocol (CDP) is the low-level line it uses to talk to Chrome. The SGS checker already uses both, layered:
- Playwright 1.58.2 is pinned at `plugins/sgs-blocks/package.json:156` (PROVEN).
- It reaches CDP through `page.context().newCDPSession` in `scripts/parity/lib/devtools.mjs::openDevtools` (PROVEN).
- "Chrome DevTools MCP" is a separate tool for agents, not part of this pipeline.

So switching tools unlocks nothing. Using more of what we already have unlocks a lot. One hard limit: CDP sessions only work in Chromium. The dispatcher throws "CDP session is only available in Chromium" (PROVEN, microsoft/playwright `browserContextDispatcher.ts`). Moving to WebKit or Firefox would break the hover forcing and the declared-value reads.

**What we use today** (grep over `scripts/parity` and `scripts/computed-route`, PROVEN):
- **Launch and pages:** `chromium.launch`, `newContext`, `newPage`, `goto`, `setContent`, `setViewportSize`.
- **Page scripts and waits:** 139 calls to `page.evaluate`, 47 calls to `page.waitForTimeout`, 11 to `page.locator`, plus `addInitScript`.
- **Network:** `ctx.route` to serve the draft offline (`fill-read.mjs::routeDraft`).
- **Screenshots:** `page.screenshot`, used only to save picture pairs for people to look at (`draft-live-walk.mjs`, `report.mjs`). No pixel comparison happens anywhere.
- **CDP calls:** `DOM.*`, `CSS.forcePseudoState`, `CSS.getMatchedStylesForNode`, `Runtime.*`.
- **Not used:** `page.clock`, `emulateMedia`, `ariaSnapshot`/`getByRole`, `routeFromHAR`, tracing, screenshot `animations`/`mask`/`style` options, and CDP's `Accessibility` or `Animation` domains.
- **Pairing:** draft and live elements are matched by word-sequence alignment (`auto-align.mjs::lcsPairs`).
- **Widths:** the walker reads each width one after another (`draft-live-walk.mjs`, the `for (const width of widths)` loop; PROVEN).

**Capabilities ranked by expected impact on the false-positive rate**

**1. Pixel checks on cropped element screenshots, joined with the in-browser trial (idea c). Highest impact.**
- **What it does.** `locator.screenshot({ animations: 'disabled', caret: 'hide' })` crops a picture to one element's box. "Disabled" means finished animations jump to their end state, looping ones reset, and the screenshot waits for web fonts to load (PROVEN, playwright `screenshotter.ts::_preparePageForScreenshot`; docs `params.md` animations option).
- **How it works for us.** For each difference row:
  1. Take a crop of the element and its enclosing block.
  2. Apply the draft value in the live page through CSS, on the element the calibration cache says the setting reaches, not on the element the row names.
  3. Take the crop again and compare pixels.
- **What it answers.**
  - Pattern 1, "paints nothing": identical pixels mean the difference paints nothing, so the row is dropped. This is a measured test, not a rule, so it cannot be over-generous. It **replaces** the shared "paints nothing" rule (REPORT §7 item 1) instead of tightening it.
  - Pattern 5, knock-on shifts: if the element's own crop matches the draft and only its position differs, it is a pure shift and goes to whichever ancestor really moved.
  - Wrong writes: the home cards would have failed this test. Writing 22px padding on the outer card box narrows the contents by 44px, which moves pixels away from the draft, so the write is rejected with no 40-second rebuild (ASSUMED until tried on home).
  - Mispaired header: the change moves pixels away from the draft and is rejected (ASSUMED).
- **What it replaces.** The guard's loop of rebuild-per-candidate trials (REPORT §7 item 3, "give the guard a memory"). Candidates get pre-filtered in the browser in milliseconds. The guard keeps one rebuild and remeasure at the end as the closing check against the rendered draft (R-31-11), so the two mechanisms do not overlap.
- **What it will not fix.**
  - Settings that change markup rather than CSS (a different tag, an added element). These cannot be tried in the browser.
  - It tests whether the CSS value is right, not whether the block's `render.php` actually emits that CSS on that element. The calibration cache must stay trusted for that.
  - Hover states need a forced `:hover` (already in `devtools.mjs`) before the crop.
- **Universality.** Pure measurement, no knowledge of any client, so it satisfies R-31-9.
- **Note on the pixel comparator.** Playwright's comparator is reachable through `toHaveScreenshot` (thresholds `maxDiffPixelRatio` and `threshold`, PROVEN, docs `class-testconfig.md`). That assertion sits in `@playwright/test`, and the walker is a plain script, so the walker would use a small pixel-diff library instead (ASSUMED that the library route is simpler).

**2. Accessibility-tree pairing check (`ariaSnapshot` or `getByRole`). Medium-high impact, mainly pattern 2 (two different elements compared).**
- **What it does.** `locator.ariaSnapshot()` returns the page's accessibility tree as YAML: each element's role, accessible name, and attributes such as heading level (PROVEN, docs `aria-snapshots.md`).
- **How it works for us.** Treat it as a second, independent key on every pair. If the draft element is `heading "SHAPE" [level=2]` and the live one is `link "SHOP"`, the pair is mispaired, and Solve must not write through it. That is REPORT §7 item 2 done structurally. It adds to the word-alignment matching; it does not replace it.
- **Version note.** Playwright 1.59 adds `page.ariaSnapshot()` and `mode: 'ai'`, which tags nodes with `[ref=e2]` references so a node can be mapped back to an element (PROVEN, 1.59 release notes and `class-locator.md`). That means a minor upgrade.
- **Alternative.** CDP's `Accessibility.getFullAXTree` gives the same data without upgrading. Pick one, never both.
- **What it will not fix.** Decorative `div` wrappers with no role are invisible to it. The header case (draft inner row versus live outer header) is two unnamed generic boxes, so it needs the box-geometry check from item 1 instead (ASSUMED).

**3. Recorded network replay for the draft (`routeFromHAR`). Medium impact on pattern 6 and on text-measurement noise.**
- `fill-read.mjs::requestAllowed` blocks external requests, so the draft's web fonts "fall back to system fonts" (the file's own comment, PROVEN). Every row about text width, height or line breaks on the draft is then measured in the wrong font.
- Fix: record the draft's network traffic once with external requests allowed, then replay it offline. That gives repeatable runs and correct fonts at the same time.
- It **replaces** the hand-maintained `mirror` map of local file copies.
- It will not fix a blank draft read that is caused by pairing.

**4. Faster, more repeatable runs. Low impact on false positives, high impact on speed.**
- **Widths in parallel.** Read each width in its own browser context at the same time. Today's serial loop roughly triples wall-clock time (ASSUMED, about 2 to 3 times faster).
- **Fixed waits.** The 47 `waitForTimeout` calls are fixed sleeps. Replace them with:
  - CDP `Animation.setPlaybackRate` (or calling `finish()` on each animation in the page) to fast-forward CSS animations;
  - `page.clock.install` / `runFor` for timers driven by JavaScript.
- **Correcting a common belief about the clock.** `page.clock` only fakes `Date`, `setTimeout`, `setInterval`, `requestAnimationFrame`, `requestIdleCallback` and `performance` (PROVEN, docs `class-clock.md` install list). It does not control CSS animations, so `settleAnimations` is still needed for those.
- **Reduced-motion emulation: avoid it here.** `emulateMedia({ reducedMotion: 'reduce' })` works (PROVEN, playwright `page-emulate-media.spec.ts`), but it would create false differences. 57 SGS CSS files honour reduced motion and the draft may not, so the two sides would render differently.

**5. Tracing with live mode (`tracing.start({ live: true })`, new in 1.59). Low impact on the rate, high value for audits.**
- A trace keeps a snapshot of the page's structure at each step. Every Solve write would carry a replayable before-and-after. That makes the 30-row false-positive re-audit (REPORT §7 item 7) quicker and checkable.
- It does not fix anything by itself.

**6. Locators instead of raw element lookups. Low impact.**
- Playwright's strict mode raises an error when a finder matches more than one element. That is a cheap tripwire for ambiguous finders, which can hide mispairs.
- `nodeChain` resolves finders through its own resolver, so this works only where locators would replace that path.

**Not worth adopting for this goal:**
- **WebKit and Firefox engines:** no CDP, so the hover forcing and declared-value reads disappear. Keep these for a later browser-compatibility QA pass.
- **`page.requestGC`:** detects memory leaks, which is irrelevant here.
- **Screenshot `mask` and `style` options:** useful only to hide carousels or live widgets in crops, as a minor helper inside item 1.

**Mapping to the six patterns and the wrong writes**

| Problem | Best lever | Status |
|---|---|---|
| 1 Paints nothing | Pixel crop before and after the trial (item 1) | Replaces the over-generous rule |
| 2 Two different elements paired | Accessibility key (item 2) plus the trial moving pixels away from the draft | Adds a check; Solve blocks writes through mispaired rows |
| 3 Child's value blamed on parent | Not Playwright. CDP `getMatchedStylesForNode` already returns `inherited` entries (used in `winning-rule.mjs`); the prepared underline fix stays | No change |
| 4 One element reported per enclosing block | Already fixed | No change |
| 5 Knock-on shifts | Crop identical, only position differs (item 1) | New |
| 6 Draft never read | Recorded replay with correct fonts (item 3); pairing gaps remain | Partial |
| Wrong writes (home cards, header) | In-browser trial (item 1) | Replaces the guard's repeated trials |

**Next action (about 15 minutes, read-only, no dependencies).** Write a scratch probe for the home page. It applies the rejected 22px card padding in the browser, takes element crops before and after, and checks that the draft-versus-live pixel difference grows. Then it repeats with the footer one-child-link gap and checks the pixel difference is exactly zero. One true-reject and one true-zero would prove item 1 on two real cases before anything is designed around it.

**Sources:**
- microsoft/playwright v1.58.2 docs: `clock.md`, `class-clock.md`, `params.md` (screenshot `animations`), `aria-snapshots.md`, `class-locator.md`, `locators.md`, `class-testconfig.md`
- v1.59.0 release notes: `page.ariaSnapshot`, `ariaSnapshot` `mode`/`depth`, live tracing, screencast
- playwright source: `screenshotter.ts`, `browserContextDispatcher.ts`, `tests/page/page-emulate-media.spec.ts` (all via Context7 `/microsoft/playwright`)

**Files read, none changed:**
- `C:/Users/Bean/Projects/small-giants-wp/scripts/parity/lib/devtools.mjs`
- `C:/Users/Bean/Projects/small-giants-wp/scripts/parity/draft-live-walk.mjs`
- `C:/Users/Bean/Projects/small-giants-wp/scripts/parity/lib/auto-align.mjs`
- `C:/Users/Bean/Projects/small-giants-wp/scripts/computed-route/lib/fill-read.mjs`
- `C:/Users/Bean/Projects/small-giants-wp/scripts/computed-route/lib/winning-rule.mjs`
- `C:/Users/Bean/Projects/small-giants-wp/.claude/reports/2026-10-09-session-d-local-baseline/REPORT.md`

### In-browser trial architect
**In-browser trial ("try before write"), from the in-browser trial architect**

**In plain English:** before Solve writes a setting into the page design and spends about 80 seconds rebuilding and re-measuring, it asks WordPress what CSS that setting would produce. It slips that CSS into the live page already open in the browser, re-measures the affected area at every width, and keeps the setting only if the page moves toward the draft. Running the same idea in reverse, it removes a difference in the browser and watches whether anything on screen changes. That is direct proof that a row "paints nothing". The rebuild and the full measuring pass (the walk) stay as the closing check. The trial only filters and ranks.

### What I checked on the local mirror (all read-only)

1. **WordPress already returns the exact CSS for any setting value. PROVEN.** I sent a POST to core's `/wp/v2/block-renderer/sgs/container` with candidate attributes. It returned the block's scoped `<style>` in 195–212ms (547ms for the first call), for example `.sgs-container-6e38e035{padding-left:22px;padding-right:22px;}`. The `<style>` stays inline because `class-sgs-css-registry.php::sgs_lift_block_css` only moves it into the shared stylesheet on the front end. The identity class (uid) is a hash of the attributes (`class-sgs-container-wrapper.php`: `'sgs-container-' . substr( md5( wp_json_encode( $attributes ) . $anchor ), 0, 8 )`). So the render predicts the real class and the real CSS, produced by the real PHP. Probe script: `scratchpad/render-probe.mjs`.
2. **An in-browser trial costs about 40ms and undoes cleanly. PROVEN** (`scratchpad/trial-probe.mjs`, home at 375px). I added `padding-inline:22px` to card `cr-ref-home-43`. Its inner box shrank from 335px to 291px and all 4 elements inside it moved, in 41ms including the measurement. This is the home doubled-padding failure reproduced without a rebuild. Cards 31, 35 and 39 still carry the bad write on the mirror (22px outside plus 22px on the inner box). Removing the injected rule restored every box exactly.
3. **The reverse check proves "paints nothing" by watching the page. PROVEN.** The footer address link has a 7px gap and one child. Forcing the gap to 0 changed no box (`unchanged: true`). This is pattern 1 shown on screen, not inferred.
4. **Calibration already records where each setting lands. PROVEN** (`lib/calibrate.mjs::slotFor`, `cache/container.json`). For each setting it records the element (`slot`/`slots`), the property, a `transform` per width, `reachedAt`, the side effects (`effects`) and the descendants that block it (`overriddenBy`). It does **not** record the CSS text or the custom property involved. That is why the render route below is more faithful than replaying from calibration.

### The design: three probes, most faithful first

**A. Render-swap (the main route).** For each candidate setting:
1. POST the node's full tree attributes plus the candidate value to block-renderer, one call per candidate, run in parallel.
2. Pull out the returned `<style>` and the root's class list.
3. In each open measuring page (one per width and state), swap the old uid class for the new one, add any modifier classes that changed, and inject the style right after `#sgs-blocks-collected-css`. That keeps the same specificity and source order as the real rule.
4. Re-measure, then undo.

Media-query tiers come along inside the returned CSS, so there is one render per candidate and one measurement per width. This is ASSUMED for every block; `sgs_responsive_css_rule` emits tiers this way for the container.

- **Fidelity self-check (makes this universal):** once per block instance, render its *current* attributes. The returned CSS must match the live uid's rules in the collected sheet. If it does not (the CSS depends on inner blocks, child count or editor context), that node is marked "needs a rebuild" and is never trialled. This replaces guessing about context-dependent blocks with one comparison per node.

**B. Calibration replay (fallback and fast pre-screen).** Inject `slot{property:value}` using calibration's slot, transform and `reachedAt`, at uid specificity, inside the framework's breakpoint media queries (from the DB). Use it where render-swap fails the self-check but the setting is a plain scalar on one element. It is lower fidelity: an inline rule can beat a cascade the real write would lose. So a passed replay only ranks a candidate. It never blocks or accepts on its own.

**C. Neutralise (the reverse).** For any open row, set the live element's property to the draft value in the browser, and on the draft set it to the live value. If no box changes and a cropped screenshot is identical, on both sides, the row is "inert". Boxes are checked for the element, everything inside it and the siblings after it. The screenshot crop catches colour and decoration differences.

**Scoring (the same for A and B):** re-run the walker's own `lib/collect.mjs::collectPair` on every pair inside the block, plus the next siblings in flow, at 375, 768, 1440 and 1920. `collectPair` is PROVEN self-contained and already runs through `page.evaluate`. Compare the results with the cached draft values (`draft-cache-<w>.json` exists). A candidate is accepted only if:
- the total distance to the draft goes down, and
- no paired element moves further from the draft, at any width or state.

Candidates that pass individually are then applied **together** as one combined trial. That catches pairs that are fine alone but break together. Only then does one rebuild happen.

### What it fixes, and what it replaces

| Problem | Effect |
|---|---|
| Pattern 1 (paints nothing) | Neutralise proves it on screen. **Replaces** the over-generous rule in ba31e5157 (REPORT §7 item 1) instead of tightening its heuristic. |
| Pattern 3 (child blamed on parent) | If the parent's setting does not move the measured child, the trial rejects the write and names the setting that does. The prepared underline fix is still worth landing: it fixes the label, the trial fixes the write. |
| Pattern 5 (knock-on shifts) | Apply the upstream element's own fix in the browser and re-read the downstream row; what remains is its own shift. Footer wordmark: 39px should split as 34px inherited and about 4px its own (ASSUMED until run). |
| Doubled padding | Caught before writing: the inner widths move 44px away from the draft (shown above). |
| Guard repeating itself | **Replaces** `guard.mjs::guardRound`'s one-suspect-per-walk trials with an in-browser search. Undo each suspect's CSS (render its "before" attributes), apply them in halves, find the culprit in seconds, then one rebuild confirms it. Do the guard-memory fix (REPORT §7 item 3) now as a stopgap, and record that it is deleted when this lands, so two mechanisms never overlap. |
| Spec 47 §3.8 (a parent setting reaching several identical children) | Bean's stated risk was "only one child is measured, the others move". The trial measures every child, so it can allow the hop only when none of them moves away. |

**What it cannot fix:**
- **Pattern 2 (two different elements paired).** A trial will happily move a live element toward the wrong draft element. The whole-area score rejects some of these because neighbours get worse, but the pairing itself must be fixed upstream (REPORT §7 item 2).
- **Pattern 6 (draft side never read).** Not a writing problem.
- **Settings that change markup or behaviour.** Tag name, layout mode, presence, content, icons, and JavaScript or Interactivity behaviour fall outside it. Render-swap returns new markup, but only the root's classes are safe to swap, so these go to the rebuild as they do today.

### Risks and how each is contained

1. **The trial says yes, the real build says no.** The rebuild and walk remain the verdict (R-31-11, R-31-4). Every trial prediction is logged next to the measurement after the rebuild, giving a running agreement rate per block and per setting. If a block's rate drops, trials for it switch off automatically. ASSUMED: high agreement for pure-CSS settings.
2. **Tiers and container queries.** Judge at all four widths, and in container-query tiers (`containerTier`) at the real container width. Hover and focus rows reuse `devtools.mjs::forcedPseudo`, so state rows can be trialled too.
3. **Editor-only effects.** WordPress's editor saves can strip or change stored attributes (memory: attribute change blast radius). That only affects the uid name, which the swap ignores. Long requests that broke earlier saves use GET; this route uses POST, which is proven to work.
4. **Animations.** Settle them first with `settleAnimations`, as the walker already does.
5. **Stale page state.** Undo each trial and check the boxes are identical before the next (proven above). Reload the page every N trials.

### Cost per page

- Home wrote 41 values across about 24 settings; product 39 settings (`solve-report.json`). With about 2–3 candidate layers per setting, a page needs **about 60–100 candidates**.
- Renders: about 200ms each, 4 in parallel, so about 5s.
- Measuring: about 40ms per trial, per width and state context, run in parallel pages. For 100 candidates across 12 contexts (4 widths × 3 states), about 5–10s of wall time.
- Combined trial plus search: a few seconds.
- **In total, about 20–40s per page, replacing most of the rounds.** Home spent 13 rounds at about 80s each (about 17 minutes, `home/2026-10-09T09-03-14`). The target is 2 rounds (write, then confirm).

### Build order

1. **(About 15 min, read-only, no dependencies.)** Extend my two probe scripts into `trial-probe.mjs`. Take one finished Solve report, run render-swap on its round-1 writes, and compare each prediction with what the round-2 walk actually measured. That gives the agreement rate before anything else is built.
2. Add the neutralise probe to triage as a "proven inert" label, replacing the ba31e5157 heuristic.
3. Add the trial step to Solve's write round, after `writeRound` and before the rebuild.
4. Replace the guard's per-walk trials with the in-browser search, and delete the stopgap memory fix.

The two scratch probe scripts are in `C:\Users\Bean\AppData\Local\Temp\claude\c--Users-Bean-Projects-small-giants-wp\a312603f-36e7-40a1-8bd1-5977270c6bfc\scratchpad\` (`render-probe.mjs`, `trial-probe.mjs`). No repo files were changed.

### Pairing and identity innovator
I'm the pairing and identity innovator. I recommend we stop guessing which draft element each block came from and use the identity the draft already carries. Every draft element is stamped at render time with a template number. Nothing in our pipeline reads it.

## 1. The finding: the draft already numbers every element, and we ignore it

**In plain English:** today the tool has to guess which bit of the draft each WordPress block copies. It lines up the words on both pages and picks the smallest draft box that holds a block's words. The Claude Design runtime already gives every element it draws a permanent number from the design source. Copies in a repeated list (for example eight product cards) share one number. We never read it.

**Technical detail:**
- The runtime stamps every element at render time. `support.js::compileTemplate` adds `data-dc-tpl="<n>"` to each template element in document order, and `walkElement` copies it onto every React element it renders. **PROVEN** (code read).
- A read-only Playwright check of the hosted draft (mintcream-lyrebird, 1440px) found:
  - 696 of 880 body elements carry the stamp.
  - The other 184 are 181 `span.sc-interp` text slots (each inside a stamped parent), the `sc-host` root, one unclassed host `div` and one `script`.
  - There are 228 distinct numbers, and 55 of them repeat: those are the copies from `sc-for` loops.
  - **PROVEN** (scratchpad `probe-tpl.mjs`).
- The same runtime (md5 `951ae391`) ships with all three drafts: the original, v2 and the Gap Handoff. So this is how the format works, not a quirk of one draft. **PROVEN** (`md5sum`). The JSON manifest appears only in v2 and the Gap Handoff (`grep data-sgs-manifest`). **PROVEN.**
- The route never reads the stamp. `grep data-dc-tpl` over `scripts/` returns nothing. The walker's draft partners are long, fragile `body > div:nth-child(1) > …` paths (`build/qa/parity/about.full.mjs`). **PROVEN.**
- The live side already has exact identity. Every block carries `cr-ref-<surface>-<n>` from `tree.mjs::addRefs`. **PROVEN.** So only the draft side is guessed.
- The design for exact identity already exists but is thrown away:
  - The Fill skeleton gives each node a `draftRef` and `draftSlots` (`fill-skeleton.mjs`).
  - `cleanTree` then removes them, and `pairs.mjs` re-guesses from words.
  - None of the 17 eye-care trees has a `draftRef` (`grep -c draftRef *.tree.json` = 0 for each).
  - **PROVEN.**

## 2. Options, strongest first

### A. Pair by the draft's own numbers (fixes pattern 2 at the root)

**In plain English:** each block records the draft element it copies once, as that element's template number. Pairing then becomes a lookup, not a guess.

**How:**
1. Keep `draftRef` after the build in a small side file, `sites/<client>/build/<page>.origin.json`, mapping `cr-ref → draft identity`. It stays out of the tree that `wp-build-page.js` receives, so `cleanTree` is untouched.
2. Write each identity as a template path plus a copy number. For example, `106/12#3` means template element 106, then element 12 inside the Frame Card it imports, third copy.
   - A path is needed because an imported component like Frame Card numbers its own elements from 0, so numbers repeat across templates. That they restart is **ASSUMED** from the per-template stamp counter in `compileTemplate`; it needs a probe before relying on it.
3. Make `[data-dc-tpl="107"]` the draft side of each pair. It is already a valid walker finder (a selector string, `collect.mjs::resolveFinder`), so no new vocabulary is needed.
4. Bootstrap the existing trees automatically:
   - Run the current word matcher once.
   - Convert each nth-child path it picks into the stamp on that element.
   - Keep only pairings that pass `judgePairing`.
   - Mark the rest unpaired for review. No values are written by hand.
5. For future clones, Fill writes the template identity directly when it builds the skeleton.

**Guard against draft revisions:** template numbers shift if the designer edits the source, so store a fingerprint with each identity (tag, class and a hash of the inline-style source). Pairing refuses a pair whose fingerprint has changed. This matters now: source index 106 is `main.sgs-page-home` in the Gap Handoff file, but rendered 106 on the hosted draft is the hero `section`. The hosted draft and this source differ by one element. **PROVEN** (`probe-src.mjs`). Either the hosted copy is another version or the runtime drops a node. **ASSUMED** which.

**What it replaces:** word pairing stops being the main mechanism. `matchWords`, `twinPlan`, `commonPath` and `paddedPartner` stay, but only as a cross-check (option D).

**Cost:** about one session for the side file, the converter and the switch in `pairs.mjs`. The draft does not need reading again.

### B. Record which element each value was actually read from (fixes pattern 3 everywhere)

**In plain English:** the tool often reads a value from an element inside a block but reports it against the block. Underlines are read from the link, but the row names the paragraph around it. Each value should carry the identity of the element that painted it.

**How:**
- `collectPair` already picks a different element for some values. Text values come from `textCarrier(el)`, layout values from `layoutElement(el)`, and decoration from `paintedDecoration`. **PROVEN** (`collect.mjs::collectPair`). It then reports everything under the finder's element.
- Return the source alongside each value: `{ value, src }`. On the draft side `src` is a template number. On the live side it is a BEM path from the block root, the format calibration's `elements` keys use.
- Solve then sends each row to the setting whose calibrated reach includes that `src`. If no setting reaches it, the row is labelled "not this block" instead of written.

**What it replaces:** the prepared fix for underlines only (`walker-decoration.test.mjs.pending`, fix list item 4). Ship this general version instead, so we don't end up with two overlapping fixes. Keep that test as one of its fixtures.

**Cost:** a walker change of about 150 lines plus tests. It changes the row format, so the triage and Solve readers must move in the same piece of work.

### C. Use the draft's repeated lists to know which elements are copies (answers your Spec 47 §3.8 decision with evidence)

**In plain English:** the draft source states which elements are copies of one design (everything inside an `sc-for` loop). So the tool can check whether every copy wants the same value, rather than trusting one measured sample.

**The rule:**
- Allow a parent setting that reaches several identical children only when:
  - every rendered copy with the same template number has the same computed value on the draft, and
  - the parent block's calibrated reach covers all their live partners.
- If any copy differs, there is no write; the row is labelled "copies disagree".
- This removes your stated risk, "if only one child is measured, the others move too", because every copy is measured.
- The mega-lenses tiles (40 rows) are the test case.

**What it replaces:** nothing ships today; it is the condition attached to §3.8.

**Cost:** small once A exists. Copy groups come free from repeated `data-dc-tpl` values.

### D. Solve refuses to write when two independent methods disagree (makes fix list item 2 safe)

**In plain English:** pair two ways, by template number and by words. Write only when both methods agree.

**The rule:** a disagreement becomes the "mispaired" label, which triage already gives (REPORT.md section 2). Solve skips that row.

**What it replaces:** fix list item 2 ("stop Solve writing through two-different-elements comparisons"), carried out as a gate that hides nothing. Rows still appear; Solve just doesn't write through them.

**Over-broad check:** if both methods agree and are both wrong, nothing catches it. Option A's fingerprint check and the closing comparison of the rendered page with the draft (R-31-11) catch that case.

### E. Fixing the home write: a block can map to two nested draft elements

**In plain English:** on home, a card block stood for a draft "outer wrapper plus inner box", and Solve put the wrapper's padding on the wrong layer.

**How:**
- The skeleton already allows slots. Map the block's root to the outer template element (`draftRef`) and its inner element to the inner one (`draftSlots`).
- Padding is then compared layer by layer, between named elements.
- Whether this fully explains the home write is **ASSUMED**. It needs proof against the home run's tree diff before relying on it.

**What it replaces:** the `paddedPartner` / `paddingElsewhere` guessing, for any surface that has an origin file.

## 3. Ideas I'd rank lower, with reasons

- **Matching by the accessibility tree** (Playwright `ariaSnapshot`, `getByRole`):
  - It only helps interactive controls, and `pairInteractives` already pairs them by type and name.
  - Keep it as a tie-breaker for unnamed controls only.
- **Image or screenshot similarity:**
  - It is expensive and easily thrown off by the placeholder images the README admits to.
  - Use it only to break ties between media in `mediaPartners`.
- **Text plus geometry optimal matching** (Hungarian assignment):
  - It is a better guesser, but A removes the need to guess.
  - It is worth having only as the fallback for drafts not made with the Claude Design runtime.

## 4. Keeping it universal (R-31-9)

- The mechanism is the same for every client: a stable draft identity plus a copy number, recorded when the tree is built and checked against a fingerprint. Restaurant, law firm or eye-care shop makes no difference.
- Only the identity source changes with the draft's format, never with the client:
  1. **Claude Design drafts:** the runtime's own `data-dc-tpl` stamp.
  2. **Plain static HTML:** a Playwright `addInitScript` stamps a parse-order number at DOMContentLoaded, before scripts run.
  3. **Anything else:** today's word matcher, with option D's agreement gate switched off. That is **ASSUMED** to be a rare case, since Spec 47's stated input is the Claude Design draft.
- The closing gate stays the rendered page against the draft (R-31-11). Exact pairing makes the rows trustworthy; it does not close anything on its own (R-31-4).

## 5. What I'd hand the council

The cheapest test is one surface (footer or header):
1. Generate the origin file from today's word pairs, convert them to template identities, and diff.
2. Every pair where the two methods disagree should be one of the audit's pattern 2 rows (header, the "SHAPE" vs "SHOP" case).
3. If the disagreement list matches the audit's known mispairs, A and D are proven. If it doesn't, we learn which of the two methods fails, and where.

That test takes about 15 minutes and is read-only apart from scratch files.

Scratch files from my probes, outside the repo:
- C:/Users/Bean/AppData/Local/Temp/claude/c--Users-Bean-Projects-small-giants-wp/a312603f-36e7-40a1-8bd1-5977270c6bfc/scratchpad/probe-tpl.mjs
- C:/Users/Bean/AppData/Local/Temp/claude/c--Users-Bean-Projects-small-giants-wp/a312603f-36e7-40a1-8bd1-5977270c6bfc/scratchpad/probe-src.mjs

### Evidence auditor
# Evidence auditor: the test set for judging the council's ideas

**Plain English first.** Below is every concrete false alarm and wrong write named in the Session D evidence. Each one has its proven cause and the single piece of information that would have prevented it. Any new idea should be scored against this list. It should remove the false alarms without silencing the real defects in section C.

Sources (all PROVEN by reading them): `.claude/reports/2026-10-09-session-d-local-baseline/{C,A,B,REPORT}.md`, `baseline-table.json`, `baseline-tree-writes.diff`, and the `wrong[]` / `writes[]` arrays of each `sites/eye-care-ward-end/build/qa/solve/<surface>/2026-10-09T*/solve-report.json`. I read those arrays with node.

**Information codes:**
- **D**: the draft's declared intent (inline `style=` or the manifest)
- **P**: exact pairing identity (role, text, manifest anchor)
- **T**: a trial measurement (does changing it paint anything?)
- **H**: a parent/child rule (which level carries it, and what an offset is relative to)
- **V**: a value-equivalence rule (two values that mean the same thing)
- **S**: both sides captured in the same state and scroll position
- **M**: the guard remembering which trials it has already run

## A. False-positive rows

| # | Surface | Row | Pattern | Proven cause | Evidence | Needed |
|---|---|---|---|---|---|---|
| 1 | footer | address link gap 7–8px | 1 | flex gap on a link with one child; no icon on either side | Live (A#6) | T, or H (fewer than 2 rendered children) |
| 2 | footer | link-terms underline, named on the root/paragraph | 3 | underline read from the inner `<a>`, row keyed to the pair path | Live + code (`collect.mjs::collectPair`, `ref-trace.mjs::TEXT_CARRIED`) | P (carrier identity) |
| 3 | footer | brand-wordmark y 6056 vs 6017 | 5 | 35 of 39px inherited from footer-root; tag also div vs h4 | Report data (C) | H (relative offset) |
| 4 | home | about-step-1 / gen-home-65 width 514.3 vs 515.25 | 1 | sub-pixel | Report data (C) | V (tolerance) |
| 5 | home | hero-image top null vs 0 | 5/6 | `top` on an unpositioned box; sides captured at different scroll positions (y 591 vs 3726) | Report data (C) | V + S |
| 6 | home | brand-strip padding-top/bottom 0 vs 26 | 2 | draft `section` paired with an empty live `__track` | Report data (C) | P |
| 7 | mega-lenses | lenses-panel scale none vs 1 (×2) | 1 | identical values | Report data (C) | V |
| 8 | mega-lenses | lenses-panel padding-bottom 40 vs 0 | 1 | box 244 vs 242, text y the same | Report data (C) | T |
| 9 | mega-lenses | lenses-trigger content none vs "" | 1 | `::after` 52×1, transparent | Live (C) | T |
| 10 | mega-lenses | lenses-card-single flex-grow 0 vs 1 | 1 | box identical | Report data (C) | T or D (the draft never declared it) |
| 11 | shop | gen-shop-5 margin-bottom / rotate | 2 | "SHAPE" span paired with "SHOP" p | Report data (C) | P (text) |
| 12 | shop | size-heading padding-top 16 vs 0 | 1 | button vs summary, same box | Report data (C) | T |
| 13 | product | add-to-bag line-height; gen-product-12 line-height | 1 | fixed-height button; text insets identical | Report data (C) | T |
| 14 | product | tabs-reveal colour 20 vs 15 | 1 | 5/255 | Report data (C) | V (perceptual tolerance) |
| 15 | header | header padding / border | 2 | draft inner row paired with live root; both sides structurally identical | Live (A#3) | P |
| 16 | mega-brands | `.cr-ref-mega-brands-8` 54×31 vs 266×84 | 2 + state | label span (0×0 when closed) measured against the whole card | Live (A#4) | P + S |
| 17 | all | 45 blank draft rows | 6 | draft side never read | Walker data (REPORT §2); fixed | measurement-completeness check |
| 18 | mega-menus | heading ×5 enclosing blocks | 4 | re-reported per ancestor | Walker data; fixed | H |
| 19 | mega-lenses | painted-ground none vs white | UNSURE | 1440 wrapper vs full-bleed | needs a 1920 screenshot | D (declared width intent) |

## B. Wrong writes

| # | Surface | Write | Proven cause | Evidence | Needed |
|---|---|---|---|---|---|
| W1 | home | padding 28/22 (34/30) on cards -31, -35, -39; the inner box already carries it, so content narrows 291→247 | level mismatch | Live + diff | H + T |
| W2 | home | brand-strip padding 0 | from mispair #6 | `wrong[]` | P |
| W3 | home | multi-button gap 12; button transition-duration 0 | ASSUMED: transition comes from settling the draft's animations; gap cause unproven | `wrong[]` | T, S |
| W4 | header | border-bottom 0; padding 12/16 (20/…); max-width 1440 on the root, all reverted | from mispair #15 | `wrong[]` + live | P |
| W5 | mega-brands | `.sgs-button__label` font-family/weight/letter-spacing/transform/colour; heading -3 line-height | from mispair #16 | `wrong[]` + live | P |
| W6 | shop | text -5 margins; product-card -50 max-width and saving-badge typography (83 rows regressed); container -1 max-width; -10/-11 padding | mispair #11; -10/-11 are a symptom of different filter content (C). Run untrusted (crash then resume) | `wrong[]` | P, D |
| W7 | product | heading -6 margins, button -8 padding, card -114 max-width, container -1 max-width 1440, text -88 margin | cause NOT proven | `wrong[]` | — |
| W8 | contact-form | `fieldPadding` per field (0/14px), `fieldMinHeight` 52 | ASSUMED level mismatch (draft padding on the input, not the field wrapper) | `wrong[]` | H |
| W9 | mega-lenses | container -2 border-top-style none | unproven | `wrong[]` | — |
| W10 | home | guard repeats rounds 5–13, so W1 is never undone | `tried` set dropped | code (`guard.mjs::guardRound`) + measured | M |

**Cross-surface repeat (ASSUMED):** "draft max-width 1440 vs live none/100%" was written at the root on header, shop and product, and reverted every time. The draft's centred-wrapper intent is landing on the wrong level, which is what code **D+H** would catch.

**Audit finding (PROVEN):** the "wrong" metric counts only what the guard reverted. Home reports 3/24, but its `writes[]` holds 12 unreverted wrong card-padding writes (W1). The real home wrong-write rate is therefore at least 15 of 41. The current figure under-reports.

**Inconsistency to settle (open):** A.md reads card -43's section padding as 0. The tree diff shows the same padding written to -43. The cause is unexplained; re-read before using -43 as a control.

## C. True positives a new mechanism must not hide

1. Footer col-visit heading: letter-spacing 2.3 vs 0.81, colour 119 vs 20, font-size 11.5 vs 13.5 (C).
2. Footer privacy/terms underline on the live `<a>`, plus the link-terms x position 1623 vs 1019 (A#1, C).
3. Footer social-row 3px shift (minor; C).
4. Home whybuy-2-heading width 299 vs 239, which shifts the text 30px (C).
5. Home cards -31/-35/-39 double padding. It is now a real rendered defect, caused by Solve.
6. Shop gen-shop-48 cards 99px taller on the draft (brand label and stars missing); sort select 152 vs 107; filter block 31px offset (real, but the row describes it wrongly).
7. Product gen-product-10 tick list 335 vs 295; product nested section doubling the main padding (40px, A#5); spec cell 171×107 vs 215×83; related card 163 vs 197; add-to-bag 44px wider on the draft.
8. Mega-brands missing "48 frames" line and card not stretching to its 266px cell (A#4).
9. Mega-lenses tile padding (40 rows, blocked by §3.8); contact-form dropdown height; mega-group child sizing (not discovered).

**Known false negatives to use as negative controls** (code findings in B.md):
- `ba31e5157` accepts gap, alignment, text-align and display whenever the box matches.
- `acceptHeld` ignores unpaired icons.
- The ledger `placed-after` rule ignores how big the shift is.

Each needs a fixture: for example, gap 48 vs 16 inside a fixed-width box must stay open.

## D. Three metrics to prove an idea works

1. **Row precision: re-run the same audit.** Same method as C.md: seed 20261009, 6 per surface, same verdict rules, on a fresh walk. Run a second, larger sample of n≈100 to bring the confidence interval to about ±10%. A random 30 alone cannot show a gain smaller than ~20 points: the current interval runs from 39% to 73%. Report the false-positive rate per pattern (1–6), not just the total.
2. **Recall on true positives.** Freeze section C plus the three negative controls as a labelled fixture set. An idea passes only if 100% of them stay open (or are correctly closed by a real fix). Pair it with the 19 false positives in A: target at least 15 of 19 rejected, with each rejection citing its information code. This catches an over-broad rule (R-31-9).
3. **Ground-truth wrong-write rate per surface, with the rendered check.** Count a write as wrong if an independent live read after the write shows its pair or any descendant moving away from the draft. This deliberately includes writes the guard never reverted, which today's metric misses (W1).
   - Target: 10% or fewer on every surface.
   - Report alongside it the walks spent per root cause closed. This exposes guard repeats (W10).
   - Close each surface only on cropped draft/live pairs at 375/768/1440/1920 plus Bean's eye (R-31-4, R-31-11, R-31-13).

# round2

### Builder
**Builder (round 2): three architectures that fit together**

**Summary.** Round 1 offered features. Grouped by which part of the system's job they fix, they form three parts. Each part replaces something that exists today, and none of them overlaps another:
1. **Identity spine:** know exactly which draft element each block copies.
2. **Try before write:** prove in the open browser that a change helps before saving it.
3. **Fair-measurement harness:** score every idea against the same labelled test cases, so we can tell whether it worked.

Build them in the order 3, 1, 2. Part 2's write trials need Part 1 first, because a trial will happily move an element towards the wrong partner.

**Two disagreements settled with evidence first**

1. **Self-stamping versus the runtime's own stamp.** The runtime's stamp wins, and I can now say how to read it.
   - `support.js::compileTemplate` resets its counter (`let tplN = 0`) for every template, so imported templates restart at 0. PROVEN.
   - The runtime also publishes `window.__dcAnnotatedTemplate(name)`, an "editor bridge" that maps each rendered `data-dc-tpl` number back to its source node (`support.js`, `Object.assign(window, api)`). PROVEN.
   - My probe of the hosted draft (`scratchpad/builder/bridge.mjs`, read-only):
     - Outside imported components, rendered tags match the bridge's source tags 508 times out of 516.
     - All 8 mismatches are `dc-import` host boxes, which render as a `div`. That is expected.
     - 184 elements sit inside 4 imports.
     - Rendered 106 = `SECTION` = bridge source 106. That clears up the round-1 "off by one": the folder file is a different version, and the bundle is the authority. PROVEN.
   - **So identity = the chain of import hosts + the element's own number, read from the page itself.** Neither the folder file nor our own stamping script is needed.
2. **Accessibility-tree pairing: high or low priority?** Low, for main pairing. `auto-compare.mjs::pairInteractives` pairs only focus and active states, not the main pairs. PROVEN. But of the auditor's pattern-2 rows, the header (#15), the brand strip (#6) and the SHAPE/SHOP case (#11) are unnamed generic boxes or text. The accessibility tree cannot tell those apart; template identity can tell all four apart (ASSUMED until the footer/header test below). Keep the accessibility tree only as a fallback for drafts not made in Claude Design.

**One premise corrected**

The walker loads the draft with no request blocking. PROVEN: there are no `route`/`abort` calls in `scripts/parity`, and only `fill-read.mjs` and `fill-entrance.mjs` call `routeDraft`. So the "wrong fonts" problem affects Fill's draft read, not the difference rows. Recorded network replay (`routeFromHAR`) belongs in Fill, not in the false-positive work.

---

### Architecture 1: Identity spine ("know what you're comparing")

**Plain English.** When a block is first built from the draft, record which draft element it copies, as a permanent address. From then on, pairing is a lookup, not a guess from matching words. Every measured value also says which element it actually came from.

**Technical.**
- **Store the address beside the tree.** A side file, `sites/<client>/build/<page>.origin.json`, maps `cr-ref → { path: "131/12#3", fingerprint }`. The fingerprint is tag + class + a hash of the inline style.
  - `cr-ref`s are permanent once assigned: `tree.mjs::addRefs` numbers new nodes after the highest existing one. PROVEN. So the side file stays valid across rebuilds.
  - The tree passed to `wp-build-page.js` is untouched.
- **Bootstrap the existing trees.** Run today's word pairing once and convert each `nth-child` finder to the `data-dc-tpl` path of the element it hits. Keep only pairs that pass `judgePairing`. No values are written by hand.
- **Use the address as the draft finder.** It is a `[data-dc-tpl=…]` finder inside its import host, which is valid input to `collect.mjs::resolveFinder` today.
- **Agreement gate.** Word pairing stays as an independent cross-check. When the two methods disagree, the row is labelled "mispaired" and Solve does not write through it.
- **Each value carries its source.** `collectPair` returns `{ value, src }`, because it already reads values from `textCarrier`, `layoutElement` and `paintedDecoration` (PROVEN). Solve sends a row only to a setting whose calibrated reach includes `src`.
- **Repeated copies from loops.** Repeated paths = copies of one design. Use this as the evidence for the Spec 47 §3.8 parent-setting hop: allow it only when every copy agrees on the draft and the parent reaches all their live partners.
- **Shared values.** `{{ secPad }}`-style bindings found in the bridge source group their rows into one site-level fix. Those groups are reported, never auto-written, until a later stage defines the write.

**What it replaces:**
- word alignment (`lcsPairs`) as the main pairing method;
- the per-surface text finders (`home.mjs::bcard`, `numTile`, `stile`);
- the `nth-child` finders;
- the underline-only pending fix: `walker-decoration.test.mjs.pending` becomes a fixture of the general `src` fix;
- fix-list items 2 (Solve writing through mispaired comparisons) and 6 (the §3.8 judgement call);
- the `paddedPartner`/`paddingElsewhere` guessing, on surfaces that have an origin file.

**Rows it fixes (from the evidence auditor's table):**
- False positives: #2, #6, #11, #15, #16.
- Wrong writes: W2, W4, W5, and the mispaired part of W6.
- The 40 Mega Lenses tile rows (§3.8) get a decision based on evidence.

**New risks:**
- **The designer revises the draft.** Numbering shifts. The fingerprint refuses changed pairs, so they need re-bootstrapping.
- **Drafts not made in Claude Design.** Fall back to a parse-order stamp (`addInitScript` at DOMContentLoaded) plus the accessibility-tree fallback.
- **Both methods agree and both are wrong.** Nothing in this architecture catches that. The closing check of the rendered page against the draft (R-31-11) does.

**First cheap proof (about 15 minutes).** On footer and header: convert today's pairs to template paths, re-derive pairs from the paths, and diff the two sets. **Pass:** the disagreements are exactly the audit's mispairs (#15 at least), and there are no new ones on rows the audit judged correct.

---

### Architecture 2: Try before write ("measure the change, not the rule")

**Plain English.** Before saving any setting, ask WordPress what CSS that setting would produce. Slip it into the live page that is already open, re-measure, and keep it only if the page moves towards the draft. Run the same idea in reverse: remove a difference in the browser, and if nothing on screen changes, the row "paints nothing", proven by measurement.

**Technical.**
- **Inert test (neutralise).** On both sides, swap the value to the other side's value. Compare boxes for the element, its descendants and its following siblings, plus a `locator.screenshot({animations:'disabled', caret:'hide'})` crop diff.
  - The crop catches colour and decoration changes that boxes miss.
  - Animated content (sliders, video) is hidden with `mask`.
  - `pixelmatch` is not installed (PROVEN), so this needs one dev dependency.
- **Render-swap trial.** As the trial architect proved (PROVEN, about 200ms per render, about 40ms per trial):
  - `/wp/v2/block-renderer` returns the setting's real scoped CSS and the new identity class.
  - Swap the class and inject the CSS after `#sgs-blocks-collected-css`.
  - Score with `collectPair` at 375/768/1440/1920, against the cached draft values.
  - Accept only when the total distance goes down and no paired element moves further away.
  - Then run one combined trial of everything accepted, then one rebuild.
- **Fidelity self-check.** For each block instance, render its current attributes first. If the result does not match the collected sheet, the node is "needs a rebuild" and is never trialled.
- **Agreement log.** Log every trial's prediction against the post-rebuild walk. Trials switch off automatically for any block whose agreement rate drops.

**What it replaces:**
- the "paints nothing" heuristic from ba31e5157 (fix-list item 1). It is replaced, not tightened. The analyst's "declared-ness" idea then moves to Fill, where it chooses the write level, instead of becoming a second "paints nothing" filter.
- `guard.mjs::guardRound`'s one-suspect-per-walk trials, replaced by an in-browser search that halves the suspects each time.
- most rebuild rounds: about 17 minutes for home becomes about 2 rounds.

The guard-memory fix (item 3) ships now as a stopgap, with its deletion recorded against this stage.

**Rows it fixes:**
- False positives: #1, #8, #9, #10, #12, #13.
- Wrong writes: W1 (reproduced in the browser, the content narrowed by 44px), W10, and probably W8 and W3 (ASSUMED).

**New risks:**
- Settings that change markup or behaviour cannot be trialled; they go to the rebuild as today.
- A mispaired row can pass a trial. That is why Architecture 1 comes first.
- Pixel crops are sensitive to sub-pixel anti-aliasing. They need a small threshold, and that threshold must itself be tested against the fixtures.

**First cheap proof.**
1. Apply the home cards' 22px padding in the browser: the pixel distance must grow.
2. Neutralise the footer link gap: the crop must be identical on both sides.
3. Replay one finished Solve run's round-1 writes through render-swap and compare with what round 2 measured. That gives the agreement rate.

---

### Architecture 3: Fair-measurement harness ("same test, same conditions, every time")

**Plain English.** A fixed set of known right and wrong answers that every change must pass. Both sides are measured in the same state and scroll position, and agreed rules say when two values mean the same thing.

**Technical.**
- **Labelled fixture set.** The evidence auditor's 19 false positives, the true positives in their section C, and the three known false negatives (ba31e5157's acceptance rule, `acceptHeld`, `placed-after`).
- **Pass bar:**
  - 100% of true positives stay open;
  - at least 15 of the 19 false positives rejected, each rejection citing its information code;
  - the real wrong-write rate (including writes the guard never reverted, so W1 counts) at 10% or below per surface.
- **Value equivalence.** A small, database-backed table: `scale none ≡ 1`, `top` on an unpositioned box ignored, a sub-pixel tolerance, a perceptual colour tolerance. Fixes #4, #5 (partly), #7, #14.
- **Same capture state.** Both sides read at the same scroll position and open/closed state. Fixes #5 and the state half of #16.
- **Speed.** Widths read in parallel contexts. The 47 `waitForTimeout` sleeps replaced by finishing animations (`Animation.setPlaybackRate`, or calling `finish()`). `page.clock` covers only JavaScript timers.
- **Trace per write.** `tracing` on each Solve write, so the next 30-row re-audit (fix-list item 7) can be checked rather than re-argued.

**What it replaces:** today's "wrong writes" metric, which counts only guard reversions and under-reports home (3/24 reported against at least 15/41 real). It also replaces ad-hoc sleeps.

**First cheap proof.** Freeze the fixtures and run today's walker against them. That gives the baseline every later change is scored against.

---

**How the three fit together without overlap**

| Problem | Owner |
|---|---|
| Pattern 2 (two different elements paired), and pattern 3 (child's value blamed on the parent) | Architecture 1 |
| Pattern 1 (paints nothing), wrong writes, guard repeats | Architecture 2 |
| Equal values, state mismatches, proof that an idea worked | Architecture 3 |
| Pattern 5 (knock-on shifts) | Architecture 2's "apply the upstream fix, re-read downstream". Architecture 1's `src` helps attribute it |
| Pattern 6 (draft side never read) | Architecture 1: an element with no template address is genuinely absent; one inside an `sc-if` branch is an un-walked state |
| W7 (product) and W9 (mega-lenses border) | Cause unproven; trace them after Architecture 3 lands |

The closing gate stays the cropped draft/live pairs at all four widths plus Bean's eye (R-31-4, R-31-11, R-31-13).

**Recommended next actions** (each about 15 minutes, read-only):
1. Freeze the fixtures (Architecture 3).
2. Run the footer/header identity diff (Architecture 1).
3. Run the home and footer trial probes (Architecture 2).

Nothing in the repo was changed. The probe script is `C:/Users/Bean/AppData/Local/Temp/claude/c--Users-Bean-Projects-small-giants-wp/a312603f-36e7-40a1-8bd1-5977270c6bfc/scratchpad/builder/bridge.mjs`.

### Constructive red team
**Red team: where the round-1 ideas hold, where they leak, and the version of each that survives**

**Summary.** Three ideas hold up as they stand:
1. Pairing by the draft's own template numbers (the pairing innovator's A and D).
2. The render-swap trial (the trial architect's A).
3. The neutralise check for rows that paint nothing (the trial architect's C).

Each needs a narrower scope than proposed, and two pairs of ideas overlap and must be merged so we don't end up with two mechanisms doing one job. The evidence auditor's fixture set should be the scorecard for all of them.

### 1. Corrections I proved myself
- **The draft runtime already stamps every element, so the analyst's own stamping duplicates it. PROVEN.** `support.js::compileTemplate` sets `data-dc-tpl` on every template node. The analyst's `addInitScript` `data-src` stamp does the same job less completely (498 elements versus 696). Drop it and use `data-dc-tpl`.
- **The runtime ships a mapping function that maps rendered elements back to the source (an "editor bridge"). PROVEN.** `support.js` exposes `api.__dcAnnotatedTemplate(name)` and `__dcTemplateSource(name)`. The comment says this exists "so it can map a rendered node (carrying the same `data-dc-tpl`) back to the source node that emitted it".
  - That likely explains the off-by-one the innovator found between hosted element 106 and source element 106. The numbering belongs to the runtime's encoded template, not to the raw file.
  - Fix: read identities through the bridge in the page. Never count elements in the `.dc.html` file.
  - ASSUMED: that `api` is reachable from the page. It sits inside a closure, and the `postMessage` near it suggests a host channel. Probe it before building on it.
- **The font problem applies to Fill only, not to the walker. PROVEN.** `routeDraft` and `requestAllowed` are used only in `fill-read.mjs` and `fill-entrance.mjs`. `draft-live-walk.mjs` opens the hosted draft with no request blocking. The Playwright researcher's item 3 (recorded network replay to restore fonts) therefore does nothing for difference rows. Its only value is for Fill's reads, which makes it low priority.
- **Spec 47 bans reading values from the draft's source. PROVEN.** `R-47-4`: "Draft source text is never parsed for values."
  - The analyst's ideas comply only if the source supplies **identity and grouping**: which element, which loop copy, which elements share one binding.
  - Reading `secPad` = `'104px 52px'` or `{{ c.hex }}` as a value breaks the spec. Values must still come from the browser measurement.
- **"Wrong write" is defined in the spec, not just in the code. PROVEN.** `R-47-9` says "only [reverted settings] count as wrong writes". The auditor's ground-truth metric, which also counts writes the guard missed (W1, the home card padding), needs that line in the spec changed. Otherwise every report keeps under-counting.
- **Live-side block references survive tree edits. PROVEN.** `tree.mjs::addRefs` keeps any existing `cr-ref` and only appends new numbers. The innovator's side file (`<page>.origin.json`, mapping each block to its draft element) is therefore safe to key on `cr-ref`.

### 2. Each idea: gaps and the version that survives

**Pairing by template number, plus "refuse to write when the two pairing methods disagree" (the innovator's A and D). Strongest idea; targets patterns 2 and 6 and wrong writes W2, W4, W5 and W6.**

Gap 1: **loop copies.** A copy number fails when the live list comes from live data. On shop, the WooCommerce products differ in order and count from the draft's fixed list (C.md W6 says the filter content differs).
- Fix: on loops the source marks as data-driven, pair the **template node** rather than the copy. Compare one representative copy on static properties only.
- This also covers the analyst's loop-uniformity rule (C).

Gap 2: **nested loops.** `106/12#3` needs one copy index per enclosing loop, for example `#2.#3`.

Gap 3: **drafts not made with Claude Design.**
- A parse-order stamp at DOMContentLoaded misses everything a React app creates after load.
- Fix: stamp from a `MutationObserver` installed by `addInitScript`, numbering elements by structural path as they are inserted.
- Be honest about the limit: React and Figma exports get word pairing plus the agreement gate. They do not get exact identity.

Cost: one session. Nothing else overlaps it; word pairing becomes the cross-check.

**Render-swap trial (the trial architect's A). Strong; targets W1, W3 and W8 and the guard repeating trials (W10).**

- **Gap 1: it cannot spot mispairs.** The trial scores through `collectPair` against the paired draft values. A mispaired row (pattern 2) makes it confidently move the page toward the wrong draft element.
  - Fix: run trials only on pairs that pass the agreement gate.
  - Order is therefore fixed: **pairing first, trials second.**
- **Gap 2: the CSS must match the real page.** WordPress's block preview endpoint (`block-renderer`) renders a block with empty `$content`. Any CSS that depends on how many children a block has, or on its inner blocks, will differ.
  - The architect's fidelity self-check (render the block's current settings and compare with the live CSS, once per block) is the right containment.
  - Keep it mandatory, and log how many blocks it excludes on each surface.
- **Gap 3: the stopgap must have an end date.** "Do the guard-memory fix now, delete it later" is acceptable only with a named removal point in the Spec 47 plan. Otherwise it breaks the no-overlapping-fixes rule.

Cost: about 20 to 40 seconds per page (ASSUMED). The architect's agreement-rate probe (round-1 predictions against round-2 measurements) is the right first step.

**Neutralise for "paints nothing" (the trial architect's C) versus pixel crops (the Playwright researcher's item 1). Merge them, and narrow the pixel part.**

- **Gap 1: crops of the draft against the live page are noisy.** Placeholder images, different text rasterisation and different content make them unreliable for accepting or rejecting a write.
  - Fix: compare pixels **only between the live page before and after a change**. Same page, same browser, so the comparison is deterministic.
  - Accept or reject writes on measured box and style distance, never on draft-against-live pixels.
- **Gap 2: what you see today is not always inert.** A value that paints nothing with this content can paint with another client's content. Examples: `flex-grow 0` versus `1` (row #10), and gap on a link that gains an icon in another state.
  - Fix: call a row "inert" only when it paints nothing at **every walked width and state**.
  - An inert row blocks the write but is **kept** in a collapsed "inert" group, never deleted. Bean can still audit it.
- **Gap 3: cost.** 1,613 rows × 12 width-and-state contexts × 2 crops comes to roughly 40,000 screenshots (ASSUMED at about 1 hour).
  - Fix: neutralise every row on a block at once (group testing).
  - If nothing moves, all of them are inert. If something moves, split the group in halves until the culprit is found.
  - Take crops only for paint properties (colour, decoration), and only when no box moved.
- **Negative controls must stay open.** The auditor's "gap 48 versus 16" inside a fixed-width box, and the footer underline (true positive #2), must stay open. Both paint, so they should.

This **replaces** the `ba31e5157` heuristic. It does not sit beside it.

**Reading declared values for every property on the draft (the analyst's step 2). Change its job.**
- As a "paints nothing" filter, it overlaps neutralise. Pick neutralise.
- Its real value is the **level** question: which layer does the draft declare padding or max-width on? That is the evidence auditor's information code H, and it points at W1, W8 and the cross-surface root `max-width: 1440`.
- It also works on class-based drafts, provided it reads matched rules as well as `inlineStyle`.
- Use it as an input to calibration: send the write to the setting that reaches the equivalent live layer.

**Shared bindings (`secPad` set once and used on seven sections) as one site-level fix (the analyst). Keep half of it.**
- Today Solve has no route to write a site-level setting (theme snapshot or style variation). ASSUMED; not checked.
- Survives now: **group** the rows in reports, and check that all seven bound elements receive the **same** write.
- The site-level default needs its own Spec 47 stage first.

**Accessibility-tree pairing (the Playwright researcher's item 2).** It overlaps `auto-compare.mjs::pairInteractives`, which already pairs controls by type and name (PROVEN). It also cannot see unnamed `div` wrappers, which is the header mispair. Use it as a tie-breaker only; don't upgrade to Playwright 1.59 for it.

**Reading widths in parallel and replacing fixed sleeps (the Playwright researcher's item 4).** Safe, no overlap, speed only. Do it after the rest.

**Tracing (the Playwright researcher's item 5).** Useful for the false-positive re-audit (REPORT §7 item 7). Not a fix.

**Child value blamed on the parent block, by recording which element each value came from (the innovator's B).** Correct, and it should replace the underline-only pending test so the two don't overlap. The catch: it changes the row format, which reaches the triage, Solve, the guard (`anchorRef`) and the report readers. Ship them together in one commit series of at least three commits (`R-31-5`).

**The Gap Map as an answer key.** I agree with the analyst: it is a grouping aid and a "look here first" signal only.

### 3. True positives at risk, and their guards
| At risk | Mechanism that could hide it | Guard |
|---|---|---|
| Footer col-visit heading typography (#1) | Neutralise, if fonts settle late | `settleAnimations` + `document.fonts.ready` before every crop |
| Shop cards 99px taller (#6) | Representative-copy pairing | Count copies per loop on both sides; a count difference stays a row |
| Mega-brands "48 frames" line missing (#8) | Template-identity pairing hides an unpaired draft node | Unpaired template nodes become "missing on live" rows, never silence |
| Mega-lenses tile padding (#9) | Loop uniformity says the copies disagree | "Copies disagree" blocks the write but keeps the row open |

### 4. Strongest as they stand, and the order
1. Template-identity pairing with the agreement gate. Fixes the root of patterns 2 and 6.
2. Neutralise, using group testing and live-before-against-after pixels. Replaces `ba31e5157`.
3. Render-swap trials, only on pairs that passed the agreement gate. Replaces the guard's repeated trials.
4. The value-source field. Fixes pattern 3 everywhere.
5. Declared-ness for picking the right layer. Then parallel widths.

**First action (about 10 minutes, read-only).** In a Playwright probe of the hosted draft, check whether `__dcAnnotatedTemplate` can be reached and whether its numbering explains the 106 off-by-one. If it can't be reached, use the innovator's fingerprint approach as the fallback.

No repo files were changed and I created no scratch files. Files read: `C:/Users/Bean/Projects/small-giants-wp/sites/eye-care-ward-end/Ward End Eye Care - SGS Gap Handoff/support.js`, `C:/Users/Bean/Projects/small-giants-wp/scripts/computed-route/lib/fill-read.mjs`, `C:/Users/Bean/Projects/small-giants-wp/scripts/computed-route/lib/tree.mjs`, `C:/Users/Bean/Projects/small-giants-wp/.claude/specs/47-COMPUTED-ROUTE-DRAFT-TO-TREE.md`, `C:/Users/Bean/Projects/small-giants-wp/plugins/sgs-blocks/includes/class-sgs-container-wrapper.php`.

### Evidence checker
**Evidence checker: fact-check and scorecard for round 1**

**Summary.** Most of round 1 holds up. I found three wrong facts that matter:
1. The runtime already stamps every draft element with its source-line number, so nobody needs to add a stamp.
2. A repeated stamp number does not reliably mean "a copy in a loop".
3. The "draft fonts are wrong" premise is about Fill's read of the draft, not the walker.

No single idea reaches the target of rejecting 15 of the 19 false alarms. Identity pairing combined with the in-browser "neutralise" check reaches about 13 to 15 of 19, with two overlaps that must be settled first.

### 1. Claims checked

| Claim | Verdict | Evidence |
|---|---|---|
| Playwright 1.58.2 is in use, and DevTools is reached through `newCDPSession` | CONFIRMED | `plugins/sgs-blocks/package.json` ("playwright": "1.58.2"), `devtools.mjs::openDevtools` |
| `declaredValues` reads inline styles, but only 8 properties | CONFIRMED | `devtools.mjs::DECLARED_PROPS` (width…top), `matched.inlineStyle` |
| The pipeline does not use `ariaSnapshot`, `routeFromHAR`, `page.clock`, `emulateMedia`, tracing or a pixel-diff library | CONFIRMED | grep hits only the word "tracing" in ref-tracing comments; no pixelmatch or odiff in `package.json` |
| 47 `waitForTimeout` calls, 139 `evaluate` calls | WRONG, but small | 50 and about 155 across `scripts/parity` and `scripts/computed-route` |
| The walker reads each width one after another | CONFIRMED | `draft-live-walk.mjs`, `for ( const width of widths )` |
| **The draft's web fonts fall back to system fonts, so walker text rows are measured in the wrong font, and HAR replay would fix it** | **WRONG** | `requestAllowed` and `routeDraft` live in `fill-read.mjs` (Fill's read). `draft-live-walk.mjs` has no `route(` and does not import fill-read, so the walker loads the hosted draft with its fonts. HAR replay fixes nothing in the walker. It would only help Fill. |
| The runtime turns each `style-hover` into a `.scpN:hover{…!important}` rule | CONFIRMED | `support.js::createPseudoSheet` uses `importantify` |
| **Source-line stamps need a Playwright `addInitScript`** (draft-source analyst) | **WRONG: redundant** | `support.js::compileTemplate` already sets `data-dc-tpl` on every template node, and `walkElement` puts it on each rendered element. `collectProps` skips `data-dc-tpl` only so it is not copied twice. Read the runtime's stamp; do not add a second one. |
| Stamp numbers restart for each template | **CONFIRMED (was ASSUMED)** | `let tplN = 0` is set inside `compileTemplate` |
| **"55 repeated numbers are loop copies"; copy groups come free from repeated `data-dc-tpl` values** | **WRONG** | My probe (`scratchpad/audit/tpl-collide.mjs`, hosted draft at 1440px): 700 stamped elements, 230 distinct numbers, 55 repeated. **16 of the 55 repeated numbers sit on elements with a different tag or class** (for example `1: LINK \| A`, `3: STYLE \| DIV.scp11`, `6: DIV \| SPAN`). Those are collisions between templates, not loop copies. Copy groups need template path + number + `sc-for` membership. Option A's `106/12#3` path is required, not optional. |
| Hosted draft has no manifest; the Gap Handoff source is off by one element | UNVERIFIED (the colleagues' probes, not rerun) | Consequence: pair against the **hosted rendered stamp**, never against indexes in the source file |
| The block identity class is an md5 of the attributes; `sgs_lift_block_css` exists | CONFIRMED | `class-sgs-container-wrapper.php` (the `$uid` line), `class-sgs-css-registry.php::sgs_lift_block_css` |
| block-renderer returns the `<style>` inline in about 200ms | UNVERIFIED (the architect's probe) | Plausible, since the lift runs on the front end |
| Calibration records slot, slots, transform, `reachedAt`, effects and `overriddenBy`, but no CSS text | CONFIRMED | `calibrate.mjs::slotFor` return object |
| The guard throws away its memory when it runs out of suspects | CONFIRMED | `guard.mjs::guardRound`, `trials.delete( r.ref )` on the no-next-suspect branch; `trials` is otherwise kept across rounds (`solve.mjs`) |
| `cleanTree` strips `draftRef`; the eye-care trees carry none | CONFIRMED | `fill-skeleton.mjs::cleanTree` filters `DRAFT_KEYS`; `grep -c draftRef` returns 0 for all 17 trees |
| `collectPair` reads from carrier and layout elements but reports under the finder's element | CONFIRMED | `collect.mjs::collectPair` (`textCarrier`, `layoutElement`, `paintedDecoration`) |
| `pairInteractives` exists | CONFIRMED | `auto-compare.mjs::pairInteractives` |
| A selector string is a valid finder | CONFIRMED | `collect.mjs::resolveFinder` |

### 2. Scoring against the evidence auditor's tables

FP# refers to the 19 false alarms in the auditor's table A and W# to its wrong writes; TP refers to the true positives in its section C.

| Idea | False alarms prevented | Wrong writes prevented | Real problems at risk of being hidden |
|---|---|---|---|
| **Identity pairing with the agreement gate** (innovator A+D, analyst §2) | #6, #11, #15, #16 (pairing part; #16 still needs the right state) = **4** | W2, W4, W5, W6 (mispair part) = **4** | None. Rows stay visible and Solve only stops writing through them. Residual risk: the bootstrap from the word matcher carries over pairs both methods get wrong. |
| **Value-source tag on each value** (innovator B) | #2 = **1** | W1, W8 possible (ASSUMED) | None, and TP2 (the underline on the live `<a>`) gets sharper |
| **Loop uniformity** (innovator C) | 0 directly | 0 | None. It unlocks TP9 (40 mega-lenses tile rows). Needs the corrected copy-group key above. |
| **Draft declared-ness for every property** (analyst §3) | #1, #10 = **2** | 0 | Low, provided it only ever *adds* a condition to the ba31e5157 rule |
| **Neutralise check** (architect C; Playwright researcher's pixel crop) | #1, #7, #8, #9, #10, #12, #13 = **7**; #4 and #14 only with a pixel threshold (+2) | — | **One real risk.** On a mispaired or unopened-state row it says "inert" wrongly. Example: #16 measures a 0×0 label span while the menu is closed. Neutralising that changes nothing, which would hide TP8 ("48 frames" missing, card not stretching). Also #19 and max-width rows change nothing at 1440 but do at 1920. |
| **Trial before write** (architect A/B) | #3 via the knock-on split (ASSUMED) | W1 (**PROVEN by the probe**: contents narrow from 335 to 291), W3, W7, W9 (ASSUMED), W10 (the search replaces the guard's repeats) | Can move a live element toward the *wrong* draft partner (#15, #16), so it must run only after the identity gate |
| `ariaSnapshot` key | at most #11 | at most W6 | Draft wrappers like #15 and #16 have no role, so it cannot see them; its job overlaps identity pairing |
| HAR replay | **0** (premise wrong for the walker) | 0 | — |
| Parallel widths, `page.clock` | 0 (speed only) | 0 | — |

**Combined** (identity pairing + value-source tag + neutralise + trial): about 13 of 19 for certain. It reaches 15 only with a pixel tolerance for #4 and #14. Wrong writes W1 to W6 and W10 are covered, and W7 and W9 depend on the trial (their causes are unproven).

**Nobody covers:**
- #5: the draft and live sides were captured at different scroll positions (y 591 vs 3726). That needs a same-state capture check (code S).
- #7 and #14: two values that mean the same thing ("none" vs 1, a 5/255 colour step). A value-equivalence rule (code V) is cheaper than neutralising for these.

### 3. Overlaps the council must settle (the "one mechanism" rule)

1. **Declared-ness versus neutralise.** Both target the ba31e5157 "paints nothing" rule. Pick neutralise as the deciding check, and keep declared-ness as reported data only. Otherwise we end up with two rules nobody can test independently.
2. **`ariaSnapshot` versus template identity.** For Claude Design drafts, use template identity. Keep the accessibility tree (or text plus geometry) only as the fallback for drafts made without the Claude Design runtime.
3. **The guard-memory stopgap versus the in-browser search.** Ship the stopgap now, and record in the plan that it is deleted when the in-browser search lands (the architect already says this).
4. **The analyst's stamping versus the runtime stamp.** Use the runtime's `data-dc-tpl` only.

### 4. Order that must hold

Neutralise and the trial may only run on pairs that pass the identity gate and were captured in the right state. Otherwise they confirm mispairs: their verdicts look like proof but measure the wrong pair of elements. So:
1. Identity pairing with template-path keys.
2. Value-source tag.
3. Neutralise, at all four widths and in every state, with a pixel tolerance.
4. Trial before write.

### 5. Proof each idea must pass first

Freeze the auditor's labelled set as fixtures: the 19 false alarms, the true positives in section C, and the 3 negative controls (gap 48 vs 16 must stay open). An idea ships only if 100% of the true positives stay open and every false alarm it rejects names its information code.

Nothing in the repo was changed. The only file I created is `C:/Users/Bean/AppData/Local/Temp/claude/c--Users-Bean-Projects-small-giants-wp/a312603f-36e7-40a1-8bd1-5977270c6bfc/scratchpad/audit/tpl-collide.mjs`.

# synthesis

# Council synthesis: draft source, Playwright and try-before-write

## 1. Plain-English answer to Bean's two questions

**Playwright.** We already use Playwright. Playwright is the remote control that drives the browser, and Chrome DevTools is the low-level line it talks down. Our checker already uses both together, with Playwright 1.58.2 opening a DevTools session (`devtools.mjs::openDevtools`, PROVEN). So switching would gain us nothing, and moving to the Firefox or WebKit engines would lose the hover-forcing and declared-value reads. What is worth adding is more of the Playwright we already have:
- cropped screenshots of one element with animations frozen, compared before and after a change on the live page;
- every width measured at the same time instead of one after another;
- the 50 fixed "wait N ms" pauses replaced with properly finishing the animations;
- a replayable trace of every Solve write.

These make the checker faster and easier to audit. On their own they fix almost none of the false alarms.

**The draft's source.** This is the bigger win, and it comes from a different direction than expected. The design tool's runtime already gives every element it draws a permanent number (`data-dc-tpl`). It also publishes a function in the page that maps each number back to its source line. We never read either. With that number we can stop guessing which draft element each block copies. It also tells us which elements are copies of one repeated design, and which spacing values are one shared setting. Values must still be measured in the browser (Spec 47 `R-47-4`); the source supplies **identity and grouping only**. The JSON manifest and the Gap Map exist only because this draft was written for SGS. They can group things and confirm things, but they must never be the only source.

## 2. Ranked options

The false-alarm (FP#) and wrong-write (W#) numbers refer to the evidence auditor's tables: 19 false alarms, 10 wrong writes, and a list of true problems that must stay open.

### Option A: measure fairly, then know what you are comparing, then try before you write (recommended)

**What it is.** The Builder's three parts, built in this order:
1. **Fair-measurement harness.** A frozen set of labelled test cases that every idea is scored against. It also adds rules for two values that mean the same thing (`scale none` is the same as `1`, a sub-pixel tolerance, a perceptual colour tolerance), and a check that both sides were captured in the same state and scroll position.
2. **Identity spine.** Each block records the draft element it copies as an import-host path plus `data-dc-tpl` plus a copy number, with a fingerprint. This lives in a side file, `<page>.origin.json`, keyed on `cr-ref`. Word pairing stays as an independent cross-check. When the two disagree, the row is labelled "mispaired" and Solve does not write through it. Each measured value also says which element it came from (`{value, src}`).
3. **Try before write.**
   - **Neutralise** (the "paints nothing" proof): change the value in the open browser and check whether any box moves, and whether a live-before versus live-after crop changes. Check every row on a block at once, then halve the group to find the culprit.
   - **Render-swap trial:** ask `/wp/v2/block-renderer` for the setting's real CSS, inject it into the live page, re-measure at all widths, and keep the setting only if the page moves towards the draft. One rebuild then confirms.

**What it fixes** (estimates from the evidence checker's scoring, not measured yet):
- **Identity:** FP #6, #11, #15, #16 and wrong writes W2, W4, W5, W6 (the mispaired part).
- **Value-source field:** FP #2.
- **Neutralise:** FP #1, #7, #8, #9, #10, #12, #13.
- **Equivalence and same-state rules:** FP #4, #5, #14.
- **Trial:** W1 (PROVEN in the browser: contents narrow 335 → 291px) and W10. W3 and W8 are ASSUMED; W7 and W9 are covered only if their unproven causes turn out to be things the trial can see.
- **Total:** about 15 of 19 false alarms with a named mechanism each. #17 and #18 are already fixed, #3 is ASSUMED via the knock-on split, and #19 is open. It also answers Spec 47 §3.8 with evidence: allow the parent write only when every copy agrees on the draft and the parent reaches all their live partners.

**What it replaces:**
- word alignment as the main pairing method;
- the nth-child finders and the per-surface text finders (`home.mjs::bcard`, `numTile`, `stile`);
- the `ba31e5157` "paints nothing" heuristic (replaced, not tightened);
- the underline-only pending fix, which becomes one fixture of the value-source field;
- `paddedPartner`/`paddingElsewhere` on surfaces that have an origin file;
- `guard.mjs::guardRound`'s one-suspect-per-walk trials;
- today's "wrong" metric. That metric under-reports: home shows 3 of 24 against at least 15 of 41 real wrong writes. Changing it needs `R-47-9` amended.

**Risks:**
- If both pairing methods agree and are both wrong, nothing here catches it. The closing comparison of the rendered page with the draft does (R-31-11).
- `block-renderer` renders with empty inner content, so CSS that depends on how many children a block has will differ. A mandatory per-block fidelity self-check marks those blocks "needs a rebuild".
- A value can paint nothing today and paint for another client. So "inert" requires every width and state, and an inert row is collapsed into its own group, never deleted.
- Changing the row format reaches triage, Solve, the guard and the reports. Ship that as at least 3 commits (R-31-5).

**Cost:** about one session each for the identity spine and for the trials. The harness is small. Trials should run at about 20–40s per page in place of about 17 minutes of rounds on home (ASSUMED).

**First proof, about 15 minutes:** freeze the fixtures and score today's walker against them. That is the baseline.

### Option B: try before write first, identity later

**What it is.** The same trial and neutralise work, shipped before the identity spine.

**What it fixes:** the fastest visible win on W1 and W10 and the "paints nothing" family (about 7 false alarms).

**What it replaces:** `ba31e5157` and the guard's repeated trials.

**Risk, and it decides this option:** without identity, a trial confidently moves a live element towards the **wrong** draft element. Neutralise also says "inert" on a mispaired or closed-state row. The evidence checker's example is #16: neutralising a 0×0 label span changes nothing, which would hide true problem 8 (the missing "48 frames" line, and the card not stretching). Those verdicts look like proof but measure the wrong pair.

**Cost:** the same as Option A's part 3.

**First proof:** the trial architect's agreement replay (below).

### Option C: keep the current fix list (REPORT §7 as written)

**What it is.** Tighten `ba31e5157`, stop Solve writing through rows triage already labels mispaired, add the guard memory, land the underline fix, judge §3.8, then re-audit.

**What it fixes:** W10, FP #2, and some mispair writes, wherever today's triage already spots the mispair.

**What it replaces:** nothing; it patches in place.

**Risks:**
- Every item is a heuristic, and heuristics are how the over-generous rule arose.
- The §3.8 decision stays a judgement call.
- The false-alarm rate is unlikely to move enough for the re-audit to detect it. With a 30-row sample, the current interval runs from 39% to 73%.

**Cost:** lowest.

**First proof:** none needed. It is already specified.

## 3. Recommendation: Option A, in the order harness, identity, neutralise, trial

**Why:** it attacks the root cause (guessed pairing) before building tools that would otherwise certify that guess. Every piece replaces a named mechanism, so nothing overlaps. And it stays universal, because the identity comes from the draft format, not the client.

Load-bearing claims:
- **Runtime stamp and bridge.** The runtime stamps every element, and `window.__dcAnnotatedTemplate` can be reached from the page. **PROVEN**: I re-ran `scratchpad/builder/bridge.mjs` on the hosted draft and got:
  - 700 stamped elements;
  - 508 rendered tags agreeing with the source and 8 disagreeing, all 8 being `dc-import` hosts;
  - 184 elements inside 4 imports;
  - rendered 106 = `SECTION` = bridge source 106.
- **Numbering restarts per template.** **PROVEN**: `support.js::compileTemplate` sets `let tplN = 0` for each template. So a bare number is not unique, and identity must be import path + number + copy index.
- **The same runtime ships with all three drafts.** **PROVEN**: v1, v2 and the Gap Handoff have identical `support.js` (diff and md5). So this is how the format works, not one draft's quirk.
- **Live-side identity is stable.** `cr-ref`s survive rebuilds. **PROVEN**: `tree.mjs::addRefs`.
- **The skeleton already carries draft references, and they are thrown away.** **PROVEN**: `fill-skeleton.mjs::cleanTree` strips `draftRef`, and the 17 trees hold none.
- **The browser trial is cheap and undoes cleanly.** **PROVEN**: about 200ms per `block-renderer` call and about 40ms per trial, with exact undo (the architect's probes). That it predicts the post-rebuild result is **ASSUMED** until the agreement replay runs.
- **Group neutralising keeps the cost reasonable.** **ASSUMED**.
- **Identity pairing reproduces the audit's mispairs.** **ASSUMED** until the footer/header diff runs.
- **Spec 47 rules.** Spec 47 bans reading values from the draft source (`R-47-4`, PROVEN). `R-47-9` must change before the true wrong-write rate can be reported (PROVEN).

Process conditions:
- The guard-memory fix ships now as a stopgap, with its removal recorded against the try-before-write stage in the Spec 47 plan.
- Site-level writes for shared bindings (`secPad` on 7 sections) have no Spec 47 stage yet. For now, report them as one grouped fix and check every bound element gets the same write; do not auto-write them.

## 4. Corrections round 2 made to round 1

1. **No new stamping is needed.** The runtime already stamps `data-dc-tpl` on 700 elements; the analyst's `addInitScript` stamp reached 498 and is redundant.
2. **A repeated number is not proof of a loop copy.** 16 of the 55 repeated numbers are collisions between different templates (different tag or class). Copy groups need path + number + `sc-for` membership.
3. **The "off by one" was a version difference, not a runtime bug.** The folder file is a different version from the hosted draft; the hosted bundle, read through the bridge, is the authority. Never count elements in the `.dc.html` file.
4. **Wrong fonts affect Fill, not the walker.** `routeDraft` and `requestAllowed` are used only by `fill-read.mjs` and `fill-entrance.mjs`. Recorded network replay therefore does nothing for difference rows.
5. **Pixel comparisons of the draft against the live page are too noisy to decide anything.** Compare pixels only between the live page before and after a change.
6. **Declared-ness for every property should not be a second "paints nothing" filter.** Its job is choosing the write layer, which is information code H and bears on W1, W8 and the repeated root `max-width: 1440` writes.
7. **Accessibility-tree pairing is a fallback only.** It cannot see unnamed wrappers (#15, #16). `pairInteractives` pairs only focus and active states, and nothing here needs Playwright 1.59.
8. **The call counts were slightly off.** There are 50 `waitForTimeout` calls, not 47, and about 155 `evaluate` calls, not 139.
9. **The "paints nothing" pixel check replaces the heuristic only if it runs after the identity check.** Before that, it can certify a mispair as inert.

## 5. What the council could not settle, and the cheapest experiment for each

| Open question | Cheapest experiment (read-only) |
|---|---|
| Does identity pairing find exactly the audit's mispairs? | **About 15 min.** On footer and header, convert today's word pairs to bridge paths and diff. Pass: #15 and the known mispairs disagree, with no new disagreements on rows the audit judged correct. |
| Does a render-swap trial predict the real rebuild? | **About 15 min.** Replay one finished Solve run's round-1 writes through render-swap and compare with the round-2 walk. That gives the agreement rate, plus a count of blocks failing the fidelity self-check. |
| Does neutralise give a clean true-reject and a clean true-zero? | **About 10 min.** The home cards' 22px padding should move boxes; the footer one-child link gap should produce an identical crop. |
| Loops filled from live data (shop: WooCommerce order and count differ from the draft's fixed list) | **About 15 min.** Pair the template node rather than the copy, compare copy counts on each side, and confirm true problem 6 (cards 99px taller) stays open. |
| Pixel tolerance or equivalence rules for #4 and #14 | Score both against the frozen fixtures; keep whichever passes all three negative controls (for example, gap 48 vs 16 must stay open). |
| Drafts not made in Claude Design (identity from a `MutationObserver` stamp) | **About 20 min.** Run the stamp and word pairing on a static HTML page; if agreement is poor, those drafts keep word pairing with the agreement gate switched off. |
| Unproven causes: W7 (product), W9 (mega-lenses border), card -43's padding (A.md and the tree diff disagree), #19 (painted ground at 1920) | Trace them after the harness lands; take a 1920 crop for #19. |

**Next three actions, about 15 minutes each, all read-only:**
1. Freeze the fixtures.
2. Run the footer/header identity diff.
3. Run the trial agreement replay.

No repo files were changed. I re-ran the builder's existing probe to verify the bridge: `C:/Users/Bean/AppData/Local/Temp/claude/c--Users-Bean-Projects-small-giants-wp/a312603f-36e7-40a1-8bd1-5977270c6bfc/scratchpad/builder/bridge.mjs`.

# challenge

Final challenge. I checked three load-bearing claims against the code and the draft runtime. One fails as stated, one is half-settled, and one holds. Each verdict below gives a repair or an experiment.

## Claim 1: "The browser trial is cheap, undoes cleanly, and uses the setting's real CSS from `/wp/v2/block-renderer`"

**FAILS as stated. It can be repaired.**

- **The 40ms proof does not test this trial. PROVEN:** `scratchpad/trial-probe.mjs` only checks whether a value paints anything. It sets `column-gap` on a link and takes it off again. `scratchpad/render-probe.mjs` only fetches CSS from `block-renderer` and prints it. Nothing has injected rendered CSS into a live page yet.
- **The fetched CSS points at a class the live element does not carry. PROVEN:**
  - SGS styles each block through a class built from a hash of all its settings, for example `class-sgs-container-wrapper.php` uid `'sgs-container-' . substr( md5( wp_json_encode( $attributes ) . $anchor ), 0, 8 )`, plus `sgs-shr-`, `sgs-sfr-`, `sgs-rl-` and `sgs-cst-` in other `render.php` files.
  - So a candidate setting produces a **new** class. CSS injected as-is matches nothing on the live element.
  - 27 `render.php` files go further and use `wp_unique_id` or `microtime`. `helpers-scoped-instance-vars.php::sgs_scope_class_for_root` mints a class from `microtime()+wp_rand()`, so no class can be predicted at all.
- **Some CSS is not in the response.**
  - That `block-renderer` keeps the `<style>` inline is PROVEN: `class-sgs-css-registry.php::sgs_lift_block_css` skips its lift when `sgs_is_frontend_render()` is false.
  - That CSS from core's own layout and style support never reaches the response is ASSUMED. Core queues that CSS separately rather than putting it in the HTML.
  - 10 blocks read values from their parent block (`usesContext`: accordion-item, icon, testimonial, product-card and others). `block-renderer` passes them no parent values.

**Repaired version:**
1. Render each block **twice**, once with its current settings from the tree and once with the candidate setting.
2. **Self-check:** the current-settings render must reproduce the live element's uid class exactly, and match the CSS the live page actually has for that uid. If it does not, label the block "needs a rebuild". This replaces the vague "per-block fidelity self-check" with a hard yes or no.
3. Diff the two CSS outputs. Rewrite the new uid to the live one, then apply the CSS changes and the outer element's class-list changes. Keep the live child elements as they are.
4. Blocks whose uid cannot be predicted (`wp_unique_id`/`microtime`), and blocks that read parent values, always go to a rebuild.
5. The agreement replay must also report what share of blocks this path covers.

## Claim 2: "The identity spine gives pairing that is independent of word alignment"

**UNSETTLED, with two gaps the planned experiment cannot detect.**

- **The first link between a block and its draft element still comes from a finder. PROVEN:**
  - The header of `fill-skeleton.mjs` says `draftRef` is "the walker finder of the draft": direct, match or js finders. That is the same family as `home.mjs::bcard`, which the council plans to replace.
  - `cleanTree` strips it. PROVEN: `DRAFT_KEYS` is filtered out in `fill-skeleton.mjs::cleanTree`.
  - The 17 existing trees hold no `draftRef`. Filling `origin.json` for them from today's word pairs would inherit today's mispairs.
- **The planned check is circular.** "Convert today's word pairs to bridge paths and diff" compares word pairing with itself. **Repair:** give the footer and header fresh `draftRef`s from Fill, without looking at the walker pairs. Then diff those against today's word pairs.
- **Elements inside a block have no live identity.** `cr-ref` sits only on block nodes (`tree.mjs::addRefs`). Inside a block, the walker still pairs elements by aligning the words of the whole page (`auto-align.mjs::lcsPairs`). Audit items #15 and #16 are unnamed wrappers **inside** blocks. So `origin.json` alone does not fix them. That it fixes "FP #15, #16" is ASSUMED, and probably wrong.
- **Repair, in two levels:**
  1. Blocks: `origin.json` records the block's draft path.
  2. Elements inside a block: match the block's named parts (from the DB element manifest, `css_element`) to the elements of that block's own draft section. Match by structure, inside that section only, never by aligning words across the whole page.
- The same gap applies to repeater items. 21 of the 22 content arrays are repeaters (`065f53c79`), and a repeater item carries no `cr-ref`.

## Claim 3: "The runtime stamps every element with a number, numbering restarts per template, and all three drafts use the same runtime"

**HOLDS.**

- `support.js::compileTemplate` sets `let tplN = 0` for each template and stamps `data-dc-tpl` on every element. The page-facing bridge is `__dcAnnotatedTemplate: (name) => runtime.annotatedTemplate(name)`.
- The tree side holds as well: `R-47-4` reads "Draft source text is never parsed for values". Identity is not a value, so this does not conflict with it.
- **Condition:** write that reading into the spec as an explicit clause when `R-47-9` is amended. Otherwise a later reviewer will read "never parsed" literally.
- This works only for drafts made in Claude Design. Other drafts fall back to word pairing, as the synthesis already says.

## What the whole council missed

1. **The draft's hover rules are all forced to `!important`, and its base values are all inline.** `support.js::collectProps` turns each `style-hover` attribute into `host.pseudoClass(...)`. `createPseudoSheet` then adds a `.scpN:hover{…}` rule through `insertRule`, with `importantify` making every declaration `!important`. So reading how a value is declared on the **draft** side says nothing about intent: every value is either inline or `!important`. Choosing the write layer from declared-ness (correction 6) must read the **live** side only. The `scpN` class names depend on content and order, so they must never be used as identity. Forced hover itself does work, because these are real `:hover` rules.
2. **Neutralise and the trial can disagree about which element owns a value.** Neutralise sets the value inline with `!important`, so it shows what the value does at that element. The trial changes a scoped rule that may cascade to children. Every row needs one owner before either test runs. That owner is the planned value-source field (`{value, src}`), so it should ship together with neutralise, not after it.
3. **The frozen fixtures are too small to score four mechanisms.** The 30-row audit has 19 false alarms, which spread across 6 patterns at roughly 3 rows each. The fixtures need at least 3 labelled rows per pattern, plus every true problem as a check that must stay open. Without that, "about 15 of 19 fixed" cannot be told apart from noise.
4. **A cheap identity check already exists in the code.** The current-settings render must reproduce the live uid, as in the claim 1 repair. Any mismatch proves the tree and the live page have drifted apart, before any trial runs. This adds no new machinery.

## Revised next three actions (all read-only)

1. **About 15 min.** On the home cards, render the current and the 22px-padding settings through `block-renderer`, rewrite the uid, inject, and measure. Pass: the content narrows from 335 to 291px, matching what was measured after the real rebuild.
2. **About 15 min.** Give the footer and header fresh `draftRef`s, read their bridge paths, and diff them against today's word pairs. Report block-level and inside-block disagreements separately.
3. **About 15 min.** Freeze the fixtures, with at least 3 rows per pattern plus the true problems as checks that must stay open.

No repo files were changed. The verdicts come from reading `support.js`, `class-sgs-css-registry.php`, `helpers-scoped-instance-vars.php`, the `render.php` files, `fill-skeleton.mjs`, `tree.mjs`, `auto-align.mjs`, Spec 47, and the scratchpad probes `trial-probe.mjs` and `render-probe.mjs`.